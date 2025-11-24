#!/usr/bin/env python3
"""
Script to update database password in Azure Key Vault
Usage: python update-kv-password.py <new-password>
"""

import subprocess
import sys

def update_keyvault_secret(secret_name: str, secret_value: str, keyvault_name: str = "bds-qms-kv"):
    """Update secret in Azure Key Vault"""
    try:
        result = subprocess.run([
            "az", "keyvault", "secret", "set",
            "--vault-name", keyvault_name,
            "--name", secret_name,
            "--value", secret_value
        ], capture_output=True, text=True, check=True, timeout=10)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to update secret in Key Vault: {e.stderr}")
        return False
    except FileNotFoundError:
        print("❌ Azure CLI not found. Install it: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli")
        return False
    except subprocess.TimeoutExpired:
        print(f"⏱️  Timeout updating secret in Key Vault")
        return False

def main():
    if len(sys.argv) < 2:
        print("❌ Error: Password not provided")
        print("Usage: python update-kv-password.py <new-password>")
        print("")
        print("Example:")
        print("  python update-kv-password.py 'MyNewPassword123!'")
        sys.exit(1)
    
    new_password = sys.argv[1]
    keyvault_name = "bds-qms-kv"
    secret_name = "db-password"
    
    print(f"🔐 Updating database password in Azure Key Vault: {keyvault_name}")
    
    if update_keyvault_secret(secret_name, new_password, keyvault_name):
        print("✅ Successfully updated password in Azure Key Vault")
        print("")
        print("💡 Next steps:")
        print("  1. Run: python scripts/update-db-password-from-kv.py")
        print("  2. Restart your backend server")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

