FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Expose port 7860 (HuggingFace default)
EXPOSE 7860

# Start FastAPI backend
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]