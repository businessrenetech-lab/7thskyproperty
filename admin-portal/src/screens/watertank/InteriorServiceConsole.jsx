import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { residentialInteriorConsole, fitnessRoomInteriorConsole, commercialInteriorConsole, customFitoutConsole, furnitureStylingConsole, prayerRoomInteriorConsole } from '../../config/consoles';

/*
 * ResidentialInteriorConsole — the Residential Interior Design operations console.
 *
 * Same shell (ui/ServiceConsole) and screens as Water Tank; only the config
 * differs (purple accent, /residential-interior-design/* nav, no Providers/
 * Compliance/AMC). Screens scope their data by the X-Service-Line header
 * (services/api.js) → the residential_interior_design service line.
 */
export default function ResidentialInteriorConsole() {
  return <ServiceConsole config={residentialInteriorConsole} />;
}

/*
 * FitnessRoomInteriorConsole — sibling Interior Design console for Fitness Room.
 * Identical shell and screens; red accent, /fitness-room-interior-design/* nav,
 * scoped to the fitness_room_interior_design service line by the header.
 */
export function FitnessRoomInteriorConsole() {
  return <ServiceConsole config={fitnessRoomInteriorConsole} />;
}

/*
 * CommercialInteriorConsole — sibling Interior Design console for Commercial
 * (office/retail/restaurant/showroom/hospitality). Identical shell and screens;
 * blue accent, /commercial-interior-design/* nav, scoped to the
 * commercial_interior_design service line by the header.
 */
export function CommercialInteriorConsole() {
  return <ServiceConsole config={commercialInteriorConsole} />;
}

/*
 * CustomFitoutConsole — sibling Interior Design console for Custom Design &
 * Fit-Out (bespoke design + fit-out across residential/office/retail/hospitality).
 * Identical shell and screens; teal-green accent, /custom-design-fit-out/* nav,
 * scoped to the custom_design_fitout service line by the header.
 */
export function CustomFitoutConsole() {
  return <ServiceConsole config={customFitoutConsole} />;
}

/*
 * FurnitureStylingConsole — sibling Interior Design console for Furniture &
 * Styling Consultation (furniture consultation, interior styling, procurement).
 * Identical shell and screens; fuchsia accent, /furniture-styling-consultation/*
 * nav, scoped to the furniture_styling_consultation service line by the header.
 */
export function FurnitureStylingConsole() {
  return <ServiceConsole config={furnitureStylingConsole} />;
}

/*
 * PrayerRoomInteriorConsole — sibling Interior Design console for Muslim Prayer
 * Room Interior Design (prayer room design, Qibla, Wudu, prayer carpets, décor).
 * Identical shell and screens; deep-emerald accent, /prayer-room-interior-design/*
 * nav, scoped to the prayer_room_interior_design service line by the header.
 */
export function PrayerRoomInteriorConsole() {
  return <ServiceConsole config={prayerRoomInteriorConsole} />;
}
