# CleanPass Django Backend

## Setup

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Edit as needed

python manage.py migrate
python manage.py seed      # Load demo data
python manage.py runserver
```

## API Endpoints

### Auth
- POST `/api/auth/register/` — Register new shop
- POST `/api/auth/login/` — Get JWT token pair
- POST `/api/auth/login/refresh/` — Refresh access token
- GET/PATCH `/api/auth/me/` — Shop profile
- GET `/api/auth/workers/` — List workers
- POST `/api/auth/workers/` — Create worker
- PATCH `/api/auth/workers/<id>/` — Update worker
- DELETE `/api/auth/workers/<id>/` — Deactivate worker
- POST `/api/auth/workers/shift/` — Clock in/out
- GET `/api/auth/qr/` — Generate QR code
- GET/PATCH `/api/auth/wifi/` — WiFi QR settings
- GET `/api/auth/dashboard/stats/` — Dashboard statistics

### Queue / Washes
- GET `/api/queue/` — Get active queue (queued + washing)
- PATCH `/api/queue/<id>/` — Update wash (status, worker, payment)

### Packages
- GET/POST `/api/packages/` — List / create packages
- PATCH/DELETE `/api/packages/<id>/` — Update / deactivate

### Vehicle Types
- GET/POST `/api/vehicle-types/` — List / create

### Vehicles
- GET `/api/vehicles/` — List all vehicles (with search)
- GET `/api/vehicles/<id>/` — Vehicle detail + wash history
- PATCH `/api/vehicles/<id>/` — add/remove/set stamps, mark paid

### Customers
- GET `/api/customers/` — List customers (with search)

### Appointments
- GET `/api/appointments/` — List appointments (filter by date)
- POST `/api/appointments/` — Create appointment
- PATCH/DELETE `/api/appointments/<id>/` — Update / delete

### Wash Requests (Approvals)
- GET `/api/wash-requests/` — Pending requests
- PATCH `/api/wash-requests/<id>/` — Approve or reject

### Reports
- GET `/api/reports/?days=30&format=csv` — Download CSV
- GET `/api/summary/?date=YYYY-MM-DD` — Daily summary

### Public (No auth)
- GET `/api/public/scan/?shopId=<uuid>` — Shop info for kiosk
- GET `/api/public/track/?plateNo=XX&shopId=<uuid>` — Track vehicle
- GET `/api/public/customer/?shopId=<uuid>&phone=xx` — Customer lookup
- POST `/api/public/wash/` — Submit new wash request
