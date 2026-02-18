
import requests
import json
import time
import logging

# Configuration
VERIFY_API_URL = "https://<YOUR_SUPABASE_PROJECT_REF>.functions.supabase.co/verify-access"

class AccessClient:
    def __init__(self):
        self.session_token = None
        self.plan = "FREE" # Default to restrictive
        self.demo_seconds = 60.0
        self.is_verified = False
        self.user_id = None

    def verify_user(self, jwt_token: str) -> dict:
        """
        Calls Supabase Edge Function to verify access.
        Returns dict with 'allowed', 'plan', 'demo_seconds'.
        """
        if not jwt_token:
            logging.error("No JWT provided for verification")
            return {"allowed": False, "error": "No Token"}

        # --- DEV BYPASS ---
        if jwt_token == "DEV_TOKEN":
            logging.info("DEV_TOKEN detected. Bypassing verification.")
            self.is_verified = True
            self.plan = "DEVELOPER"
            self.demo_seconds = 999999.0
            self.user_id = "dev_user"
            return {"allowed": True, "plan": "DEVELOPER", "demo_seconds": 999999.0}
        # ------------------

        try:
            headers = {"Authorization": f"Bearer {jwt_token}"}
            response = requests.post(VERIFY_API_URL, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                self.is_verified = data.get("allowed", False)
                self.plan = data.get("plan", "FREE")
                self.demo_seconds = data.get("demo_seconds", 60.0)
                self.user_id = data.get("user_id")
                
                logging.info(f"Access Verified: Plan={self.plan}, Demo={self.demo_seconds}s")
                return data
            else:
                logging.error(f"Verification Failed: {response.status_code} - {response.text}")
                return {"allowed": False, "error": f"API Error {response.status_code}"}
                
        except Exception as e:
            logging.error(f"Network Error during verification: {e}")
            return {"allowed": False, "error": "Network Error"}

    def get_session_limits(self):
        if not self.is_verified:
            return {"allowed": False}
        return {
            "allowed": True,
            "plan": self.plan,
            "demo_seconds": self.demo_seconds
        }
