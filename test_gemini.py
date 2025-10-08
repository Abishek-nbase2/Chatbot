import google.generativeai as genai

genai.configure(api_key="AIzaSyDdntn1fc4rzKpVbDFY9cphq9bAPo0Zo6U")
for m in genai.list_models():
    print(m.name)