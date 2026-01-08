import os
import uuid
from typing import Optional, BinaryIO
from pathlib import Path
from app.core.config import settings

try:
    from azure.storage.blob import BlobServiceClient
    from azure.storage.file.share import ShareServiceClient
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False

class StorageService:
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE
        self.upload_dir = settings.UPLOAD_DIR
        
        if self.storage_type == "azure" and AZURE_AVAILABLE:
            self._init_azure_storage()
        else:
            self._init_local_storage()
    
    def _init_local_storage(self):
        """Initialize local storage"""
        os.makedirs(self.upload_dir, exist_ok=True)
        self.storage_type = "local"
    
    def _init_azure_storage(self):
        """Initialize Azure Storage"""
        if not settings.STORAGE_CONNECTION_STRING:
            raise ValueError("STORAGE_CONNECTION_STRING is required for Azure storage")
        
        self.blob_service_client = BlobServiceClient.from_connection_string(
            settings.STORAGE_CONNECTION_STRING
        )
        self.share_service_client = ShareServiceClient.from_connection_string(
            settings.STORAGE_CONNECTION_STRING
        )
        self.container_client = self.blob_service_client.get_container_client(
            settings.CONTAINER_NAME
        )
        self.share_client = self.share_service_client.get_share_client(
            settings.FILE_SHARE_NAME
        )
    
    def save_file(self, file_data: BinaryIO, filename: str, content_type: str = None) -> str:
        """Save a file and return the file path/URL"""
        if self.storage_type == "azure":
            return self._save_to_azure(file_data, filename, content_type)
        else:
            return self._save_to_local(file_data, filename)
    
    def _save_to_local(self, file_data: BinaryIO, filename: str) -> str:
        """Save file to local storage"""
        # Generate unique filename
        file_extension = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(self.upload_dir, unique_filename)
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_data.read())
        
        return file_path
    
    def _save_to_azure(self, file_data: BinaryIO, filename: str, content_type: str = None) -> str:
        """Save file to Azure Storage"""
        # Generate unique filename
        file_extension = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Upload to blob storage
        blob_client = self.container_client.get_blob_client(unique_filename)
        
        # Set content type if provided
        kwargs = {}
        if content_type:
            kwargs['content_settings'] = {
                'content_type': content_type
            }
        
        blob_client.upload_blob(file_data, **kwargs)
        
        return blob_client.url
    
    def get_file_url(self, file_path: str) -> str:
        """Get the URL for a file"""
        if self.storage_type == "azure":
            # For Azure, file_path should be the blob URL
            return file_path
        else:
            # For local storage, return a relative path
            return f"/uploads/{os.path.basename(file_path)}"
    
    def delete_file(self, file_path: str) -> bool:
        """Delete a file"""
        try:
            if self.storage_type == "azure":
                # Extract blob name from URL
                blob_name = file_path.split('/')[-1]
                blob_client = self.container_client.get_blob_client(blob_name)
                blob_client.delete_blob()
            else:
                # Delete local file
                if os.path.exists(file_path):
                    os.remove(file_path)
            return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
    
    def list_files(self, prefix: str = "") -> list:
        """List files in storage"""
        if self.storage_type == "azure":
            blobs = self.container_client.list_blobs(name_starts_with=prefix)
            return [blob.name for blob in blobs]
        else:
            files = []
            for filename in os.listdir(self.upload_dir):
                if filename.startswith(prefix):
                    files.append(filename)
            return files

# Global storage service instance
storage_service = StorageService()
