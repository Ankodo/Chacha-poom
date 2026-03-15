FROM python:3.13-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install .
COPY src/ src/
CMD ["python", "-m", "src.main"]
