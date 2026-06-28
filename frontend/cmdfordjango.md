python -m venv venv

source venv/bin/activate

pip freeze > requirements.txt

open -a Docker

docker compose up -d
docker compose ps  # Verify all 3 services are running


# Make migrations
python manage.py makemigrations

# Migrate
python manage.py migrate
python manage.py createsuperuser


python manage.py runserver