FROM python:3.12-slim

WORKDIR /app

# FixLens usa solo la librería estándar de Python (sin dependencias externas)
COPY . .

EXPOSE 8000

# Render inyecta la variable PORT; server.py la lee (por defecto 8000)
CMD ["python", "server.py"]
