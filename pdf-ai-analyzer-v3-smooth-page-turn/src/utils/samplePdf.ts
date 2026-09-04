/**
 * Generates realistic multi-page PDF catalogs for virtual viewing:
 * 1. "Aura Living 2026 Interior & Design Catalog" (6 pages, 2-page spreads, products & prices)
 * 2. "NovaTech AI Hardware & Gadget Lookbook" (4 pages)
 */

export interface SampleCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  pages: number;
  getPdf: () => { base64: string; name: string; size: number };
}

function createAuraInteriorCatalog(): { base64: string; name: string; size: number } {
  // 6-Page Architectural & Interior Design Catalog
  const pdf = `%PDF-1.4
%âãÏÓ
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R 7 0 R 10 0 R 13 0 R 16 0 R 19 0 R]
  /Count 6
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 4 0 R
      /F2 5 0 R
    >>
  >>
  /Contents 6 0 R
>>
endobj
4 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica-Bold
>>
endobj
5 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
6 0 obj
<< /Length 960 >>
stream
BT
/F1 32 Tf
60 680 Td
(A U R A   L I V I N G) Tj
/F2 13 Tf
0 -26 Td
(AUTUMN / WINTER 2026 ARCHITECTURAL COLLECTION) Tj
0 -40 Td
/F1 16 Tf
(VIRTUAL SHOWROOM CATALOG) Tj
/F2 11 Tf
0 -24 Td
(Issue No. 14  |  Curated Nordic & Japanese Minimalist Furniture) Tj
0 -45 Td
(_____________________________________________________________________) Tj
0 -60 Td
/F1 14 Tf
(Featuring:) Tj
/F2 12 Tf
0 -24 Td
(â  The Stockholm Sculptural Oak Lounge Chair) Tj
0 -22 Td
(â  Kanso Modular Organic Linen Sectional) Tj
0 -22 Td
(â  Kyoto Fluted Travertine Coffee Table) Tj
0 -22 Td
(â  Lumen Architectural Brass Pendant Series) Tj
0 -22 Td
(â  ErgoForm Solid Walnut Workspace Suite) Tj
0 -60 Td
(Designed in Copenhagen & Tokyo  |  Crafted from Sustainable FSC-Certified Wood) Tj
0 -20 Td
(Prices in USD  |  Complimentary Worldwide White-Glove Delivery on orders over $1,500) Tj
0 -120 Td
/F1 12 Tf
([ Click next page or use the bottom navigation to open the catalog spread ]) Tj
ET
endstream
endobj
7 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 4 0 R
      /F2 5 0 R
    >>
  >>
  /Contents 8 0 R
>>
endobj
8 0 obj
<< /Length 1100 >>
stream
BT
/F1 20 Tf
60 710 Td
(Table of Contents & Design Philosophy) Tj
/F2 10 Tf
0 -18 Td
(PAGE 02 OF 06  â  AURA LIVING 2026) Tj
0 -36 Td
/F1 13 Tf
(01. Living Room & Lounge Spaces .................................................. Page 03) Tj
0 -24 Td
(02. Architectural Lighting & Vessels ............................................ Page 04) Tj
0 -24 Td
(03. Home Studio & Ergonomic Workspaces ................................ Page 05) Tj
0 -24 Td
(04. Ordering, Material Care & Showroom Index .......................... Page 06) Tj
0 -50 Td
/F1 14 Tf
(Our Philosophy: Honest Craft, Silent Luxury) Tj
/F2 11 Tf
0 -22 Td
(At Aura, we believe that true calm begins with spaces stripped of noise.) Tj
0 -18 Td
(Every curve, joinery seam, and woven fiber in this collection has been) Tj
0 -18 Td
(engineered for generational durability and sensory comfort.) Tj
0 -30 Td
(Materials We Cherish:) Tj
0 -20 Td
(- European White Oak: Harvested from renewable managed forests in Bavaria) Tj
0 -18 Td
(- Italian Boucle & Natural Flax: Loom-woven without synthetic dyes) Tj
0 -18 Td
(- Tuscan Honed Travertine: Hand-carved in historical stoneworks outside Siena) Tj
0 -18 Td
(- Spun Raw Brass: Unlacquered surface that patinas gracefully with touch) Tj
0 -40 Td
(All items in this catalog are in stock and ready for immediate dispatch.) Tj
ET
endstream
endobj
10 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 4 0 R
      /F2 5 0 R
    >>
  >>
  /Contents 11 0 R
>>
endobj
11 0 obj
<< /Length 1350 >>
stream
BT
/F1 20 Tf
60 710 Td
(Collection 01: The Living Room) Tj
/F2 10 Tf
0 -18 Td
(PAGE 03 OF 06  â  SEATING & TABLES) Tj
0 -40 Td
/F1 14 Tf
(1. The Stockholm Oak Lounge Chair) Tj
/F2 11 Tf
0 -18 Td
(Item No: AL-STK-04  |  Price: $680 USD) Tj
0 -16 Td
(Sculptural frame carved from solid quarter-sawn white oak with natural wax finish.) Tj
0 -16 Td
(Deep cushioned seat upholstered in textured Belgian oatmeal linen.) Tj
0 -16 Td
(Dimensions: 78cm W x 82cm D x 74cm H  |  Weight Capacity: 180 kg) Tj
0 -35 Td
/F1 14 Tf
(2. Kanso Modular 3-Piece Sectional Sofa) Tj
/F2 11 Tf
0 -18 Td
(Item No: AL-KNS-09  |  Price: $2,450 USD) Tj
0 -16 Td
(Low-profile Japanese-inspired lounge seating with feather-down blend cushions.) Tj
0 -16 Td
(Available in Chalk Sand, Slate Graphite, and Olive Moss.) Tj
0 -16 Td
(Stain-resistant performance bouclÃ© upholstery, fully removable slipcovers.) Tj
0 -16 Td
(Dimensions: 290cm W x 105cm D x 68cm H) Tj
0 -35 Td
/F1 14 Tf
(3. Kyoto Fluted Travertine Coffee Table) Tj
/F2 11 Tf
0 -18 Td
(Item No: AL-KYO-02  |  Price: $890 USD) Tj
0 -16 Td
(Hand-chiseled monolithic travertine with organic vein patterns and honed matte top.) Tj
0 -16 Td
(Dimensions: 110cm Diameter x 35cm H  |  Weight: 64 kg) Tj
0 -30 Td
(Complementary sample swatches available upon request.) Tj
ET
endstream
endobj
13 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 4 0 R
      /F2 5 0 R
    >>
  >>
  /Contents 14 0 R
>>
endobj
14 0 obj
<< /Length 1300 >>
stream
BT
/F1 20 Tf
60 710 Td
(Collection 02: Architectural Lighting) Tj
/F2 10 Tf
0 -18 Td
(PAGE 04 OF 06  â  LIGHTING & ACCENTS) Tj
0 -40 Td
/F1 14 Tf
(1. Lumen Fluted Brass Pendant) Tj
/F2 11 Tf
0 -18 Td
(Item No: AL-LUM-01  |  Price: $340 USD) Tj
0 -16 Td
(Precision-milled unlacquered brass shade with handblown opal glass diffuser.) Tj
0 -16 Td
(Emits a gentle 2700K warm ambient glow ideal over dining tables and islands.) Tj
0 -16 Td
(Includes 2.5m braided linen cord and matching brass ceiling canopy.) Tj
0 -35 Td
/F1 14 Tf
(2. Solis Sculptural Floor Lamp) Tj
/F2 11 Tf
0 -18 Td
(Item No: AL-SOL-07  |  Price: $495 USD) Tj
0 -16 Td
(Slender arched steel stem counterbalanced by a solid Black Marquina marble base.) Tj
0 -16 Td
(Integrated step-less touch dimmer on column with memory recall.) Tj
0 -16 Td
(Height: 185cm  |  Reach: 120cm  |  Color: Matte Black / Raw Brass) Tj
0 -35 Td
/F1 14 Tf
(3. Wabi Ceramic Vessel Trio) Tj
/F2 11 Tf
0 -18 Td
(Item No: AL-WAB-03  |  Price: $180 USD (Set of 3)) Tj
0 -16 Td
(Wheel-thrown stoneware glazed with coarse volcanic ash slip.) Tj
0 -16 Td
(Waterproof interiors suitable for fresh botanical stems or sculptural display.) Tj
ET
endstream
endobj
16 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 4 0 R
      /F2 5 0 R
    >>
  >>
  /Contents 17 0 R
>>
endobj
17 0 obj
<< /Length 1250 >>
stream
BT
/F1 20 Tf
60 710 Td
(Collection 03: The Home Studio) Tj
/F2 10 Tf
0 -18 Td
(PAGE 05 OF 06  â  STUDIO & WORKSPACE) Tj
0 -40 Td
/F1 14 Tf
(1. ErgoForm Solid Walnut Standing Desk) Tj
/F2 11 Tf
0 -18 Td
(Item No: AL-ERG-12  |  Price: $1,280 USD) Tj
0 -16 Td
(Continuous-grain American black walnut desktop with concealed cable raceway.) Tj
0 -16 Td
(Dual whisper-quiet motors (<38dB) with 4 programmable memory presets.) Tj
0 -16 Td
(Height Range: 62cm to 128cm  |  Desktop Size: 160cm x 80cm x 3.2cm) Tj
0 -35 Td
/F1 14 Tf
(2. Aero Contoured Task Chair) Tj
/F2 11 Tf
0 -18 Td
(Item No: AL-AER-05  |  Price: $640 USD) Tj
0 -16 Td
(Responsive lumbar matrix with breathable 3D woven elastomeric mesh.) Tj
0 -16 Td
(Cast aluminum wheelbase with smooth hard-floor casters and 4D armrests.) Tj
0 -16 Td
(Certified BIFMA Level 3 for all-day 12+ hour ergonomic support.) Tj
0 -35 Td
/F1 14 Tf
(3. MagGrid Magnetic Cable Management Dock) Tj
/F2 11 Tf
0 -18 Td
(Item No: AL-MGD-08  |  Price: $85 USD) Tj
0 -16 Td
(Anodized space-grey aluminum dock with neodymium magnetic cable organizers.) Tj
ET
endstream
endobj
19 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 4 0 R
      /F2 5 0 R
    >>
  >>
  /Contents 20 0 R
>>
endobj
20 0 obj
<< /Length 1150 >>
stream
BT
/F1 24 Tf
60 710 Td
(AURA LIVING) Tj
/F2 11 Tf
0 -24 Td
(BACK COVER  â  SHOWROOMS & CUSTOMER CARE) Tj
0 -45 Td
/F1 14 Tf
(Flagship Virtual & Physical Showrooms) Tj
/F2 11 Tf
0 -22 Td
(Copenhagen: Kronprinsensgade 12, 1114 KÃ¸benhavn K) Tj
0 -18 Td
(Tokyo: 5-7-22 Minamiaoyama, Minato-ku, Tokyo 107-0062) Tj
0 -18 Td
(New York: 42 Mercer Street, SoHo, NY 10013) Tj
0 -40 Td
/F1 14 Tf
(Client Concierge & Trade Program) Tj
/F2 11 Tf
0 -22 Td
(Email: concierge@aura-living.example.com  |  Phone: +1 (800) 555-0199) Tj
0 -18 Td
(Trade Program for Architects & Interior Designers: 25% Trade Discount.) Tj
0 -40 Td
/F1 14 Tf
(Guarantee & 10-Year Warranty) Tj
/F2 11 Tf
0 -22 Td
(All structural frames and mechanical desk components carry a 10-year warranty.) Tj
0 -18 Td
(30-day in-home trial period with hassle-free returns.) Tj
0 -60 Td
(Â© 2026 Aura Living Design Group. All rights reserved.) Tj
ET
endstream
endobj
xref
0 21
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000185 00000 n 
0000000317 00000 n 
0000000391 00000 n 
0000000460 00000 n 
0000001499 00000 n 
0000001631 00000 n 
0000002810 00000 n 
0000002943 00000 n 
0000004372 00000 n 
0000004505 00000 n 
0000005884 00000 n 
0000006017 00000 n 
0000007346 00000 n 
0000007479 00000 n 
trailer
<<
  /Size 21
  /Root 1 0 R
>>
startxref
8708
%%EOF
`;

  return {
    base64: btoa(pdf),
    name: "Aura_Living_2026_Catalog.pdf",
    size: pdf.length,
  };
}

export function generateSamplePdf(): { base64: string; name: string; size: number } {
  return createAuraInteriorCatalog();
}

export const SAMPLE_CATALOGS: SampleCatalogItem[] = [
  {
    id: "aura-interior-2026",
    name: "Aura Living 2026 Interior Catalog",
    description: "6-Page Minimalist Architectural & Furniture Catalog with Spreads, Prices, & Dimensions",
    category: "Furniture & Decor",
    pages: 6,
    getPdf: createAuraInteriorCatalog,
  },
];
