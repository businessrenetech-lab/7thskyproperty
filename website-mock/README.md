# Seventh Sky Property Management — Public Website Mock

A clean, minimalist, high-end public website mock for **Seventh Sky Property Management**, built strictly in accordance with:
1. `website_requirements.txt` (Main menu structure, 10–15 word hover service descriptions, Upstate property listings, NRB dedicated services).
2. The landing hero reference from `image.png` (clean white panel wall backdrop, bold *"The Property Experts."* dark typography, electric cyan CTA button, and floating pill search bar).
3. Complete decoupling from the main production code (`backend/`, `admin-portal/`).

---

## Getting Started

### 1. Run the Frontend (Vite)
Open a terminal in the `website-mock/` directory:
```bash
cd website-mock
npm install
npm run dev
```
Open **`http://localhost:3005`** in your browser to interact with the website mock.

### 2. (Optional) Run the Standalone Mock REST Server
In a separate terminal, to serve real HTTP JSON endpoints on port `5050`:
```bash
cd website-mock
npm run server
```
This runs Express on `http://localhost:5050`. Check `http://localhost:5050/api/docs` or see [ENDPOINTS.md](./ENDPOINTS.md).

---

## Key Features Implemented

1. **Hero Section (1:1 with `image.png`)**:
   - Clean vertical textured panel wall backdrop
   - Bold navy headline: *"The Property Experts."*
   - Floating pill search container with purpose dropdown ("buy", "rent", "short stay", "care"), divider, location input, and vibrant cyan pill search button.
   - Luxury minimalist royal blue interior styling accent.

2. **Service Hover Display (Section 3 of Requirements)**:
   - Hovering over any service item displays its exact 10–15 word operational scope.
   - Example (Cleaning Services): *"Professional cleaning solutions maintaining hygiene, comfort and property presentation."*
   - Example (Gardening & Landscaping): *"Enhance outdoor spaces through professional gardening, landscaping and maintenance."*

3. **Upstate-Inspired Property Listings (Section 4 of Requirements)**:
   - Visual gallery slider
   - Video Tour & Drone Video viewer
   - Interactive Floor Plan viewer
   - Nearby Places connectivity table (Transit, Schools, Shopping, Healthcare with walking times)
   - Real-time Inspection slot booking modal
   - Direct Agent contact and inquiry form

4. **Dedicated Sections**:
   - **NRB Dedicated Services**: Remote monitoring, 4K video inspections, and overseas owner financial statements.
   - **Institutional Care & Metrics**: 98.4% retention, ৳850+ Cr portfolio value, 24/7 care dispatch.
   - **Testimonials & FAQs**: Verified client reviews and common questions.
   - **Client & Provider Login Modals**: Quick authentication modal for owners and contractors.
