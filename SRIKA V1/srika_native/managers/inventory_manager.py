
import os
import json
import logging
from cryptography.fernet import Fernet
from pathlib import Path

# Constants
APPDATA = Path(os.getenv('APPDATA')) / "SRIKA"
SYSTEM_DIR = APPDATA / "system"
INVENTORY_DIR = APPDATA / "inventory"
KEY_FILE = SYSTEM_DIR / "master.key"

class InventoryManager:
    def __init__(self):
        self._ensure_directories()
        self.key = self._load_or_generate_key()
        self.cipher = Fernet(self.key)
        self.active_preset_id = None
        self._load_state()

    def _ensure_directories(self):
        SYSTEM_DIR.mkdir(parents=True, exist_ok=True)
        INVENTORY_DIR.mkdir(parents=True, exist_ok=True)

    def _load_or_generate_key(self):
        if KEY_FILE.exists():
            return KEY_FILE.read_bytes()
        else:
            key = Fernet.generate_key()
            KEY_FILE.write_bytes(key)
            return key

    def _load_state(self):
        state_file = SYSTEM_DIR / "state.json"
        if state_file.exists():
            try:
                state = json.loads(state_file.read_text())
                self.active_preset_id = state.get("active_preset_id")
            except Exception as e:
                logging.error(f"Failed to load state: {e}")

    def save_state(self):
        state_file = SYSTEM_DIR / "state.json"
        state = {"active_preset_id": self.active_preset_id}
        state_file.write_text(json.dumps(state))

    def save_preset(self, preset_data: dict):
        """
        Encrypts and saves a preset to local inventory.
        preset_data must contain 'id'.
        """
        preset_id = preset_data.get("id")
        if not preset_id:
            raise ValueError("Preset must have an ID")

        json_bytes = json.dumps(preset_data).encode('utf-8')
        encrypted_data = self.cipher.encrypt(json_bytes)
        
        file_path = INVENTORY_DIR / f"{preset_id}.srk"
        file_path.write_bytes(encrypted_data)
        logging.info(f"Saved encrypted preset: {preset_id}")

    def load_preset(self, preset_id: str) -> dict:
        """
        Loads and decrypts a preset from local inventory.
        """
        file_path = INVENTORY_DIR / f"{preset_id}.srk"
        if not file_path.exists():
            raise FileNotFoundError(f"Preset {preset_id} not found")

        encrypted_data = file_path.read_bytes()
        json_bytes = self.cipher.decrypt(encrypted_data)
        return json.loads(json_bytes)

    def list_inventory(self) -> list:
        """
        Returns a list of owned preset metadata (decrypted).
        """
        presets = []
        for file in INVENTORY_DIR.glob("*.srk"):
            try:
                preset_id = file.stem
                data = self.load_preset(preset_id)
                # Return minimal metadata
                presets.append({
                    "id": data.get("id"),
                    "name": data.get("name"),
                    "game": data.get("game"),
                    "version": data.get("version", "1.0"),
                    "active": preset_id == self.active_preset_id
                })
            except Exception as e:
                logging.error(f"Failed to load preset {file}: {e}")
        return presets

    def delete_preset(self, preset_id: str):
        file_path = INVENTORY_DIR / f"{preset_id}.srk"
        if file_path.exists():
            os.remove(file_path)
            logging.info(f"Deleted preset: {preset_id}")

    def set_active_preset(self, preset_id: str):
        if (INVENTORY_DIR / f"{preset_id}.srk").exists():
            self.active_preset_id = preset_id
            self.save_state()
            # In a real app, this would trigger Engine reload
            logging.info(f"Active preset set to: {preset_id}")
        else:
            raise FileNotFoundError(f"Cannot activate {preset_id}: Not in inventory")

