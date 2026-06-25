# 🧼 CleanPass Backend API Blueprint

* **Base URL (Development):** `http://127.0.0.1:8000`
* **Content-Type Required:** `application/json`
* **Authentication Header:** All protected paths expect `Authorization: Bearer <access_token>`

---

## 🔐 Authentication & Administration (`/api/auth/`)

| Endpoint Route | HTTP Method | Auth Required | Payload / Query Parameters | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register/` | `POST` | No | `{ "username": "...", "password": "...", "email": "..." }` | Register a new shop manager profile |
| `/api/auth/login/` | `POST` | No | `{ "username": "...", "password": "..." }` | Obtain JWT Access & Refresh tokens |
| `/api/auth/login/refresh/` | `POST` | No | `{ "refresh": "<refresh_token>" }` | Swap an expired access token for a fresh one |
| `/api/auth/google/` | `POST` | No | `{ "credential": "<google_jwt_token>" }` | Exchange Google SSO tokens for application session |
| `/api/auth/shops/me/` | `GET` / `PUT` | **Yes** | *None* / `{ "name": "...", "address": "..." }` | Read or update current active profile configurations |
| `/api/auth/qr/` | `GET` | **Yes** | *None* | Fetch shop physical vector/string QR metrics |
| `/api/auth/wifi/` | `GET` / `POST` | **Yes** | `{ "ssid": "...", "password": "..." }` | Manage internal client Wi-Fi presets |
| `/api/auth/dashboard/stats/` | `GET` | **Yes** | *None* | **Feeds Overview Screen:** Returns total counts & 7-day arrays |
| `/api/auth/workers/` | `GET` / `POST` | **Yes** | `{ "name": "...", "role": "..." }` | List employees or invite a new worker |
| `/api/auth/workers/<uuid:pk>/` | `GET` / `PUT` / `DELETE` | **Yes** | *None* | Inspect, modify role status, or delete an employee profile |
| `/api/auth/workers/shift/` | `GET` / `POST` | **Yes** | `{ "worker_id": "<uuid>", "action": "clock_in/out" }` | Clock-in/out or review hourly logs |

---

## 🚿 Shop Floor Operations (`/api/washstations/`)

| Endpoint Route | HTTP Method | Auth Required | Payload / Query Parameters | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/api/washstations/queue/` | `GET` / `POST` | **Yes** | `{ "vehicle_id": "<uuid>", "package_id": "<uuid>" }` | **Feeds Wash Queue Screen:** List live wash status or queue vehicle |
| `/api/washstations/queue/<uuid:pk>/` | `GET` / `PATCH` / `DELETE` | **Yes** | `{ "status": "completed/in_progress" }` | Modify bay placement, adjust sequence, or close entry |
| `/api/washstations/packages/` | `GET` / `POST` | **Yes** | `{ "name": "...", "price": 450, "vehicle_type": "..." }` | List or register dynamic package tier prices |
| `/api/washstations/packages/<uuid:pk>/` | `GET` / `PUT` / `DELETE` | **Yes** | *None* | Modify parameters or archive service catalog options |
| `/api/washstations/requests/` | `GET` / `POST` | **Yes** | `{ "details": "..." }` | View or document intake service configurations |
| `/api/washstations/requests/<uuid:pk>/` | `GET` / `PUT` / `DELETE` | **Yes** | *None* | Inspect or change structural client intake scopes |
| `/api/washstations/appointments/` | `GET` / `POST` | **Yes** | `{ "date": "...", "time": "..." }` | Track booking grids and reserve time windows |
| `/api/washstations/appointments/<uuid:pk>/` | `GET` / `PUT` / `DELETE` | **Yes** | *None* | Approve slot requests or reschedule calendars |
| `/api/washstations/reports/` | `GET` | **Yes** | `?start_date=YYYY-MM-DD` | Request downloadable records or payroll datasets |
| `/api/washstations/summary/` | `GET` | **Yes** | *None* | Summarized manager metrics |

### 🌐 Endpoints for Customers (No Headers Required)
| Endpoint Route | HTTP Method | Payload Parameters | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/washstations/public/scan/` | `POST` | `{ "qr_token": "..." }` | Self check-in event triggered by smartphone QR code scan |
| `/api/washstations/public/track/` | `GET` | `?order_id=<uuid>` | Live pipeline progress widget page for client browsers |
| `/api/washstations/public/customer/` | `GET` / `POST` | `{ "phone": "...", "plate": "..." }` | Self-guided registration forms on client smartphones |
| `/api/washstations/public/wash/` | `GET` | *None* | Renders public display pipeline configurations on client wait rooms |
| `/api/washstations/public/approval/` | `POST` | `{ "request_id": "<uuid>", "approve": true }` | Allows customer to remotely authorize up-sold services |
| `/api/washstations/public/wifi/` | `GET` | *None* | Captive-portal style page handing out visitor Wi-Fi keys |

---

## 🚗 Customer & Assets Engine (`/api/vehicles/` & `/api/customers/`)

| Endpoint Route | HTTP Method | Auth Required | Payload Parameters | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/api/vehicles/` | `GET` / `POST` | **Yes** | `{ "plate_number": "...", "customer_id": "..." }` | **Feeds Vehicles Screen:** Directory lookup for active cars |
| `/api/vehicles/<uuid:pk>/` | `GET` / `PUT` / `DELETE` | **Yes** | *None* | Modify specific metadata parameters or delete vehicle entry |
| `/api/vehicles/types/` | `GET` / `POST` | **Yes** | `{ "name": "Sedan/SUV/Bike", "multiplier": 1.0 }` | Manage pricing variations by vehicle classification |
| `/api/customers/` | `GET` / `POST` | **Yes** | `{ "name": "...", "phone": "..." }` | **Feeds Customers Screen:** Track client profiles & points balances |
| `/api/subscriptions/` | `GET` / `POST` | **Yes** | `{ "title": "Unlimited Monthly" }` | Control loyalty tiers and corporate account parameters |