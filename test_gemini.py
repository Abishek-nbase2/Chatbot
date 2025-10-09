from groq import Groq

client = Groq(api_key=api_key);

# List available models
print("Available Groq models:")
try:
    models = client.models.list()
    for model in models.data:
        print(f"- {model.id}")
except Exception as e:
    print(f"Error listing models: {e}")

# Test a simple chat completion
print("\nTesting chat completion:")
try:
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": "Hello! Please respond with 'Groq API test successful' if you can see this message."
            }
        ],
        model="llama-3.3-70b-versatile",  # Updated to available model
        temperature=0.1,
        max_tokens=50,
        top_p=1,
        stream=False
    )
    
    response = chat_completion.choices[0].message.content
    print(f"✅ Response: {response}")
    
except Exception as e:
    print(f"❌ Error: {e}")