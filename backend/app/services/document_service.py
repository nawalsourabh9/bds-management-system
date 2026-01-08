"""
Document Upload Service for Azure Blob Storage
This service handles document uploads, downloads, and management using Azure Blob Storage
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient
from azure.identity import DefaultAzureCredential
from loguru import logger

class DocumentService:
    def __init__(self):
        self.connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.account_url = os.getenv("AZURE_STORAGE_ACCOUNT_URL")
        self.container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "bds-documents")
        
        # Initialize Azure Blob Service Client
        if self.connection_string:
            self.blob_service_client = BlobServiceClient.from_connection_string(self.connection_string)
        elif self.account_url:
            # Use managed identity or service principal
            credential = DefaultAzureCredential()
            self.blob_service_client = BlobServiceClient(account_url=self.account_url, credential=credential)
        else:
            logger.warning("Azure Storage not configured - using local storage fallback")
            self.blob_service_client = None
        
        # Ensure container exists
        if self.blob_service_client:
            self._ensure_container_exists()
    
    def _ensure_container_exists(self):
        """Ensure the blob container exists"""
        try:
            container_client = self.blob_service_client.get_container_client(self.container_name)
            if not container_client.exists():
                container_client.create_container()
                logger.info(f"Created Azure Blob container: {self.container_name}")
        except Exception as e:
            logger.error(f"Error ensuring container exists: {e}")
    
    async def upload_document(self, file_data: bytes, filename: str, content_type: str, 
                            user_id: str, task_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload a document to Azure Blob Storage
        
        Args:
            file_data: File content as bytes
            filename: Original filename
            content_type: MIME type of the file
            user_id: ID of the user uploading the file
            task_id: Optional task ID if document is related to a task
            
        Returns:
            Dictionary with upload details
        """
        try:
            if not self.blob_service_client:
                return await self._local_upload_fallback(file_data, filename, content_type, user_id, task_id)
            
            # Generate unique blob name
            file_extension = os.path.splitext(filename)[1]
            blob_name = f"{user_id}/{task_id or 'general'}/{uuid.uuid4()}{file_extension}"
            
            # Upload to Azure Blob Storage
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name, 
                blob=blob_name
            )
            
            blob_client.upload_blob(
                file_data,
                content_type=content_type,
                metadata={
                    'original_filename': filename,
                    'uploaded_by': user_id,
                    'task_id': task_id or '',
                    'upload_date': datetime.now().isoformat()
                }
            )
            
            # Generate SAS URL for secure access (optional)
            sas_url = self._generate_sas_url(blob_name)
            
            return {
                'success': True,
                'blob_name': blob_name,
                'original_filename': filename,
                'content_type': content_type,
                'file_size': len(file_data),
                'upload_url': sas_url,
                'uploaded_by': user_id,
                'task_id': task_id,
                'upload_date': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error uploading document: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def download_document(self, blob_name: str) -> Optional[bytes]:
        """
        Download a document from Azure Blob Storage
        
        Args:
            blob_name: Name of the blob to download
            
        Returns:
            File content as bytes or None if error
        """
        try:
            if not self.blob_service_client:
                return await self._local_download_fallback(blob_name)
            
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name, 
                blob=blob_name
            )
            
            download_stream = blob_client.download_blob()
            return download_stream.readall()
            
        except Exception as e:
            logger.error(f"Error downloading document {blob_name}: {e}")
            return None
    
    async def delete_document(self, blob_name: str) -> bool:
        """
        Delete a document from Azure Blob Storage
        
        Args:
            blob_name: Name of the blob to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.blob_service_client:
                return await self._local_delete_fallback(blob_name)
            
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name, 
                blob=blob_name
            )
            
            blob_client.delete_blob()
            logger.info(f"Deleted document: {blob_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting document {blob_name}: {e}")
            return False
    
    async def list_documents(self, user_id: Optional[str] = None, 
                           task_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List documents in Azure Blob Storage
        
        Args:
            user_id: Filter by user ID
            task_id: Filter by task ID
            
        Returns:
            List of document metadata
        """
        try:
            if not self.blob_service_client:
                return await self._local_list_fallback(user_id, task_id)
            
            container_client = self.blob_service_client.get_container_client(self.container_name)
            documents = []
            
            # Build prefix for filtering
            prefix = ""
            if user_id:
                prefix = f"{user_id}/"
                if task_id:
                    prefix += f"{task_id}/"
            
            blobs = container_client.list_blobs(name_starts_with=prefix)
            
            for blob in blobs:
                documents.append({
                    'blob_name': blob.name,
                    'original_filename': blob.metadata.get('original_filename', ''),
                    'content_type': blob.content_settings.content_type,
                    'file_size': blob.size,
                    'uploaded_by': blob.metadata.get('uploaded_by', ''),
                    'task_id': blob.metadata.get('task_id', ''),
                    'upload_date': blob.metadata.get('upload_date', ''),
                    'last_modified': blob.last_modified.isoformat() if blob.last_modified else ''
                })
            
            return documents
            
        except Exception as e:
            logger.error(f"Error listing documents: {e}")
            return []
    
    def _generate_sas_url(self, blob_name: str, expiry_hours: int = 24) -> str:
        """Generate a SAS URL for secure access to a blob"""
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name, 
                blob=blob_name
            )
            
            # Generate SAS token with read permissions
            sas_token = blob_client.generate_sas(
                permission="r",
                expiry=datetime.now() + timedelta(hours=expiry_hours)
            )
            
            return f"{blob_client.url}?{sas_token}"
            
        except Exception as e:
            logger.error(f"Error generating SAS URL: {e}")
            return ""
    
    # Local storage fallback methods
    async def _local_upload_fallback(self, file_data: bytes, filename: str, 
                                   content_type: str, user_id: str, 
                                   task_id: Optional[str] = None) -> Dict[str, Any]:
        """Fallback to local storage when Azure is not configured"""
        try:
            # Create local upload directory
            upload_dir = "uploads"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)
            
            # Save file locally
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            return {
                'success': True,
                'blob_name': unique_filename,
                'original_filename': filename,
                'content_type': content_type,
                'file_size': len(file_data),
                'upload_url': f"/uploads/{unique_filename}",
                'uploaded_by': user_id,
                'task_id': task_id,
                'upload_date': datetime.now().isoformat(),
                'storage_type': 'local'
            }
            
        except Exception as e:
            logger.error(f"Error in local upload fallback: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _local_download_fallback(self, blob_name: str) -> Optional[bytes]:
        """Fallback to local storage for downloads"""
        try:
            file_path = os.path.join("uploads", blob_name)
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    return f.read()
            return None
        except Exception as e:
            logger.error(f"Error in local download fallback: {e}")
            return None
    
    async def _local_delete_fallback(self, blob_name: str) -> bool:
        """Fallback to local storage for deletions"""
        try:
            file_path = os.path.join("uploads", blob_name)
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            logger.error(f"Error in local delete fallback: {e}")
            return False
    
    async def _local_list_fallback(self, user_id: Optional[str] = None, 
                                 task_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fallback to local storage for listing"""
        try:
            upload_dir = "uploads"
            if not os.path.exists(upload_dir):
                return []
            
            documents = []
            for filename in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    documents.append({
                        'blob_name': filename,
                        'original_filename': filename,
                        'content_type': 'application/octet-stream',
                        'file_size': stat.st_size,
                        'uploaded_by': 'unknown',
                        'task_id': '',
                        'upload_date': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'storage_type': 'local'
                    })
            
            return documents
            
        except Exception as e:
            logger.error(f"Error in local list fallback: {e}")
            return []

# Global document service instance
document_service = DocumentService()
