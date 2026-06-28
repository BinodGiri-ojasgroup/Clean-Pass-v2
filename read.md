# CleanPass Car Wash Management System - Backend Database Documentation

**Target Framework:** Django 5.x / Django REST Framework (DRF)  
**Database Architecture:** Multi-Tenant SaaS (Isolated by Washstation)

---

## 1. Executive Architecture Overview

This system is built as a **Multi-Tenant SaaS platform** tailored for car wash stations. 

* **The Core Tenant:** `Washstation` acts as the primary tenant container. Almost all business data, customer records, and operations are strictly isolated under a specific `WashstationId`.
* **Primary Keys:** Primary keys use Prisma-style alphanumeric CUIDs (`max_length=30`) rather than standard auto-incrementing integers. This keeps data decoupled from sequential database leakage and aligns with client-side requirements.
* **Data Isolation:** Data integrity across different car wash locations is structurally enforced using composite unique constraints (e.g., a customer phone number or a vehicle plate can exist across different independent wash stations, but must be completely unique within a single station).

---

## 2. Relational Mapping & Integrity Rules