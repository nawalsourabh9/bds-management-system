#!/usr/bin/env python3
"""
Script to fetch database password from Azure Key Vault and update .env file
This should be run once to sync the password, then the .env file will be used
"""

import subprocess
import sys
from pathlib import Path

def get_azure_secret(secret_name: str, keyvault_name: str = "bds-qms-kv") -> str:
    """Get secret from Azure Key Vault"""
    try:
        result = subprocess.run([
            "az", "keyvault", "secret", "show",
            "--vault-name", keyvault_name,
            "--name", secret_name,
            "--query", "value",
            "-o", "tsv"
        ], capture_output=True, text=True, check=True, timeout=10)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to get secret {secret_name} from Key Vault {keyvault_name}: {e.stderr}")
        return None
    except FileNotFoundError:
        print("❌ Azure CLI not found. Install it: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli")
        return None
    except subprocess.TimeoutExpired:
        print(f"⏱️  Timeout fetching secret from Key Vault")
        return None

def update_env_file(env_file_path: Path, password: str):
    """Update DB_PASSWORD in .env file"""
    if not env_file_path.exists():
        print(f"❌ .env file not found at {env_file_path}")
        return False
    
    # Read the file
    with open(env_file_path, 'r') as f:
        lines = f.readlines()
    
    # Backup the file
    backup_path = env_file_path.with_suffix('.env.backup')
    with open(backup_path, 'w') as f:
        f.writelines(lines)
    print(f"📋 Created backup: {backup_path}")
    
    # Update DB_PASSWORD line
    updated = False
    for i, line in enumerate(lines):
        if line.startswith('DB_PASSWORD='):
            lines[i] = f'DB_PASSWORD={password}\n'
            updated = True
            break
    
    if not updated:
        # Add DB_PASSWORD if it doesn't exist
        lines.append(f'\nDB_PASSWORD={password}\n')
    
    # Write the updated file
    with open(env_file_path, 'w') as f:
        f.writelines(lines)
    
    return True

def main():
    keyvault_name = "bds-qms-kv"
    secret_name = "db-password"
    
    print(f"🔐 Fetching database password from Azure Key Vault: {keyvault_name}")
    
    password = get_azure_secret(secret_name, keyvault_name)
    
    if not password:
        print("⚠️  Failed to fetch password from Key Vault. Keeping existing password in .env file.")
        sys.exit(1)
    
    print("✅ Successfully retrieved password from Key Vault")
    
    # Find .env file in backend directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    backend_dir = project_root / 'backend'
    env_file = backend_dir / '.env'
    
    if update_env_file(env_file, password):
        print(f"✅ Updated DB_PASSWORD in {env_file}")
        print("💡 Restart your backend server to use the new password")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

