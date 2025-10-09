#!/usr/bin/env python3
"""
Test Groq API with a real API call
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from groq import Groq

def test_groq_api_call(api_key: str):
    """Test actual Groq API call"""
    try:
        print("🧪 Testing Groq API call...")
        
        client = Groq(api_key=api_key)
        
        # Test the actual chat completion
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": "Hello! Please respond with 'API test successful' if you can see this message."
                }
            ],
            model="llama-3.1-70b-versatile",
            temperature=0.1,
            max_tokens=50,
            top_p=1,
            stream=False
        )
        
        response = chat_completion.choices[0].message.content
        print(f"✅ API Response: {response}")
        
        return True
        
    except Exception as e:
        print(f"❌ API Error: {e}")
        if "401" in str(e):
            print("💡 This looks like an authentication error. Please check your API key.")
        elif "404" in str(e):
            print("💡 The model might not be available. Try a different model.")
        else:
            print("💡 Check your internet connection and API key.")
        return False

if __name__ == "__main__":
    print("🚀 Groq API Call Test")
    print("=" * 40)
    
    api_key = input("Enter your Groq API key (or press Enter to skip): ").strip()
    
    if api_key:
        success = test_groq_api_call(api_key)
        if success:
            print("\n🎉 API call test passed!")
            print("✅ Your Groq API key is working correctly")
        else:
            print("\n❌ API call test failed!")
            print("🔧 Please check your API key and try again")
    else:
        print("\n⏭️ Skipping API call test")
        print("💡 Run this script with your API key to test the actual API connection")