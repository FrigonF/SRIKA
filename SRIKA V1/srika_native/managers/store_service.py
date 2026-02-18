
import time
from .inventory_manager import InventoryManager

class StoreService:
    def __init__(self, inventory_mgr: InventoryManager):
        self.inventory_mgr = inventory_mgr

    def get_catalog(self):
        """
        Returns hardcoded catalog of StoreItems.
        In future, this would fetch from API.
        """
        return [
            {
                "id": "asphalt9_pro",
                "name": "Asphalt 9 Pro",
                "game": "Asphalt 9",
                "version": "1.2",
                "price": "Free",
                "description": "Optimized for Legends. Smooth steering and precise drift.",
                "engine_config": {
                    # Mock Engine Config
                    "deadzone": 0.15,
                    "curve": 2.2,
                    "smoothing": 0.12
                }
            },
            {
                "id": "tekken8_mishima",
                "name": "Tekken 8 Mishima",
                "game": "Tekken 8",
                "version": "1.0",
                "price": "Free",
                "description": "Electric Wind God Fist capable. High sensitivity.",
                "engine_config": {
                    "deadzone": 0.05,
                    "curve": 1.0,
                    "smoothing": 0.05
                }
            },
            {
                "id": "sf6_modern",
                "name": "SF6 Modern",
                "game": "Street Fighter 6",
                "version": "2.0",
                "price": "Free",
                "description": "Modern Controls mapping for casual play.",
                "engine_config": {
                    "deadzone": 0.10,
                    "curve": 1.5,
                    "smoothing": 0.10
                }
            }
        ]

    def download_preset(self, preset_id: str):
        """
        Simulates downloading a preset and saving it to inventory.
        """
        catalog = self.get_catalog()
        item = next((i for i in catalog if i["id"] == preset_id), None)
        
        if not item:
            raise ValueError("Preset not found in store")

        # Simulate Network Delay
        time.sleep(0.5)

        # Convert StoreItem to Preset Schema (add signature etc in real app)
        preset = item.copy()
        preset["installed_at"] = time.time()
        
        # Save to Local Inventory (Encrypted)
        self.inventory_mgr.save_preset(preset)
        return True
