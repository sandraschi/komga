@echo off
echo Starting Weaviate with Docker Compose...
docker-compose -f docker-compose.weaviate.yml up -d

echo.
echo Weaviate should now be running at http://localhost:8080
echo You can check the status with: docker-compose -f docker-compose.weaviate.yml ps
echo To stop Weaviate, run: docker-compose -f docker-compose.weaviate.yml down

pause
