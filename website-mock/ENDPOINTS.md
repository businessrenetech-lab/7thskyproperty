# Seventh Sky Property Management — Mock API Endpoints Catalog

This directory (`website-mock/`) contains a complete mock API suite that powers the clean minimalist website. It is available in two modes:
1. **Client-Side Virtual Mock** (`src/services/mockApi.js`): Works natively inside the React frontend without any backend processes running.
2. **Standalone Node/Express HTTP Server** (`server.js`): Accessible via HTTP on `http://localhost:5050` for `curl`, Postman, or external integration tests.

---

## 1. Properties Endpoints

### `GET /api/properties`
Fetch property listings with optional search and filtering.
- **Query Parameters**:
  - `purpose`: Filter by `Sale`, `Rent`, `Guest House / Short Term Stay`, or `all`
  - `category`: Filter by `Residential`, `Commercial`, `Rural`, `Business`, or `all`
  - `query`: Keyword search against title, location, suburb, or property code
  - `featured`: `true` or `false`
- **Response**:
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "id": "prop-01",
      "code": "SSP-GUL-902",
      "title": "The Glass Pavilion & Sky Villa",
      "category": "Residential",
      "purpose": "Sale",
      "propertyType": "Penthouse",
      "price": 48500000,
      "priceDisplay": "৳4.85 Cr",
      "location": "Road 79, Gulshan 2, Dhaka",
      "bedrooms": 4,
      "bathrooms": 5,
      "carSpaces": 3,
      "sizeSqft": 4200,
      "heroImage": "https://images.unsplash.com/...",
      "featured": true
    }
  ]
}
```

### `GET /api/properties/:id`
Fetch full Upstate-style property detail by ID or property code.
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "prop-01",
    "code": "SSP-GUL-902",
    "title": "The Glass Pavilion & Sky Villa",
    "subtitle": "Architectural Penthouse with Private Terrace & Panoramic Skyline",
    "gallery": ["url1", "url2", "url3"],
    "videoUrl": "https://www.youtube.com/embed/...",
    "droneVideoUrl": "https://www.youtube.com/embed/...",
    "floorPlanUrl": "https://...",
    "features": ["Smart Biometric Access", "Private Heated Plunge Pool"],
    "nearbyPlaces": [
      { "category": "Transit", "name": "Gulshan Circle 2 Hub", "distance": "450 m" }
    ],
    "agent": {
      "name": "Tariqul Islam",
      "role": "Senior Property Advisor",
      "phone": "+880 1711 002233"
    },
    "inspectionTimes": ["Saturday 11:00 AM - 12:00 PM"]
  }
}
```

---

## 2. Services Endpoints

### `GET /api/services`
Fetch categorized services with exact 10-15 word hover descriptions.
- **Response**:
```json
{
  "success": true,
  "categories": [
    {
      "id": "property-care-concierge",
      "title": "Property Care & Concierge",
      "services": [
        {
          "id": "cleaning-services",
          "name": "Cleaning Services",
          "explanation": "Professional cleaning solutions maintaining hygiene, comfort and property presentation.",
          "icon": "Sparkles",
          "subItems": ["Deep Cleaning", "Rooftop Cleaning"]
        }
      ]
    }
  ],
  "hiddenServices": [
    {
      "id": "solar-energy-solutions",
      "title": "Solar & Energy Solutions",
      "hiddenNotice": "Temporarily hidden in public launch"
    }
  ]
}
```

### `GET /api/services/:categoryId`
Fetch an individual service category.

---

## 3. Interactive Lead & Booking Endpoints

### `POST /api/enquiries`
Submit an inquiry for a property.
- **Request Body**:
```json
{
  "propertyId": "prop-01",
  "propertyCode": "SSP-GUL-902",
  "name": "Rahim Khan",
  "email": "rahim@example.com",
  "phone": "+880 1700 000000",
  "message": "Interested in private viewing."
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "referenceCode": "ENQ-749182",
  "message": "Enquiry received. A property specialist will contact you shortly."
}
```

### `POST /api/inspections/book`
Book an inspection time slot (Upstate inspection style).
- **Request Body**:
```json
{
  "propertyId": "prop-01",
  "propertyCode": "SSP-GUL-902",
  "name": "Nafis Iqbal",
  "phone": "+880 1811 111222",
  "email": "nafis@example.com",
  "timeSlot": "Saturday 11:00 AM - 12:00 PM"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "bookingRef": "INSP-398104",
  "message": "Inspection confirmed for SSP-GUL-902 at Saturday 11:00 AM - 12:00 PM."
}
```

### `POST /api/appraisals/book`
Request property valuation / rental appraisal.
- **Request Body**:
```json
{
  "propertyAddress": "Plot 14, Road 4, Baridhara, Dhaka",
  "propertyType": "Residential Apartment",
  "purpose": "Rental Management",
  "ownerName": "Kazi Rahman",
  "phone": "+880 1711 999888",
  "email": "kazi@example.com"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "appraisalRef": "APP-551029",
  "message": "Appraisal request submitted. Our senior valuer will contact you within 24 hours."
}
```

### `POST /api/contact`
General inquiries and feedback.

---

## 4. Authentication / Portal Logins

### `POST /api/auth/client-login`
Client / Owner / Landlord login endpoint.
- **Request Body**: `{ "email": "owner@example.com", "password": "password123" }`
- **Response**: Returns mock JWT token and client profile with portfolio metrics.

### `POST /api/auth/provider-login`
Service provider / contractor login endpoint.
- **Request Body**: `{ "email": "provider@example.com", "password": "password123" }`
- **Response**: Returns mock JWT token and provider profile with active work order stats.

---

## 5. Informational Endpoints

- `GET /api/testimonials`: Returns client reviews & ratings.
- `GET /api/faqs`: Returns answers to common owner/tenant queries.
- `GET /api/company-info`: Returns office addresses, hotlines, and portfolio stats.
- `GET /api/docs`: Self-describing schema of all endpoints.
