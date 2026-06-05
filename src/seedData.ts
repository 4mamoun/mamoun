// ============================================================
// Seed Data — بيانات تجريبية كاملة ( direct localStorage writes )
// ============================================================

import { useDataStore } from './store/dataStore';

// ─── Helpers ───
function uid(n: number) {
  // Deterministic IDs so products can reference parts reliably
  return 'id_' + n.toString(36).padStart(6, '0');
}
function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// ─── Parts (40 items) ───
const PARTS = [
  { id: uid(1), revit: 'WL-CNC-001', name: 'لوح CNC جدار أبيض', type: 'part' as const, unit: 'm2', qty: 120, min: 20, source: 'local' as const, supplierCode: '', length: '2800', width: '2070', height: '18', createdAt: today(-60), updatedAt: today(), barcode: 'PR-2026-000001' },
  { id: uid(2), revit: 'WL-CNC-002', name: 'لوح CNC جدار بيج', type: 'part' as const, unit: 'm2', qty: 85, min: 15, source: 'local' as const, supplierCode: '', length: '2800', width: '2070', height: '18', createdAt: today(-60), updatedAt: today(), barcode: 'PR-2026-000002' },
  { id: uid(3), revit: 'DR-SLD-001', name: 'باب سحاب ألومنيوم', type: 'part' as const, unit: 'pcs', qty: 45, min: 10, source: 'local' as const, supplierCode: '', length: '2400', width: '900', height: '40', createdAt: today(-58), updatedAt: today(), barcode: 'PR-2026-000003' },
  { id: uid(4), revit: 'DR-SLD-002', name: 'باب سحاب زجاجي', type: 'part' as const, unit: 'pcs', qty: 30, min: 8, source: 'local' as const, supplierCode: '', length: '2400', width: '900', height: '10', createdAt: today(-58), updatedAt: today(), barcode: 'PR-2026-000004' },
  { id: uid(5), revit: 'HD-HNG-001', name: 'مفصلة باب ثقيلة', type: 'part' as const, unit: 'pcs', qty: 200, min: 50, source: 'import' as const, supplierCode: 'SUP-482', length: '120', width: '120', height: '25', createdAt: today(-55), updatedAt: today(), barcode: 'PR-2026-000005' },
  { id: uid(6), revit: 'HD-HNG-002', name: 'مفصلة باب خفيفة', type: 'part' as const, unit: 'pcs', qty: 350, min: 80, source: 'import' as const, supplierCode: 'SUP-291', length: '90', width: '90', height: '20', createdAt: today(-55), updatedAt: today(), barcode: 'PR-2026-000006' },
  { id: uid(7), revit: 'SL-GLD-001', name: 'قضيب تعليق سقفي', type: 'part' as const, unit: 'pcs', qty: 60, min: 15, source: 'import' as const, supplierCode: 'SUP-773', length: '3000', width: '40', height: '40', createdAt: today(-52), updatedAt: today(), barcode: 'PR-2026-000007' },
  { id: uid(8), revit: 'SL-GLD-002', name: 'قضيب تعليق جداري', type: 'part' as const, unit: 'pcs', qty: 80, min: 20, source: 'import' as const, supplierCode: 'SUP-884', length: '2000', width: '35', height: '35', createdAt: today(-52), updatedAt: today(), barcode: 'PR-2026-000008' },
  { id: uid(9), revit: 'KN-DRW-001', name: 'مقبض درج استانلس', type: 'part' as const, unit: 'pcs', qty: 500, min: 100, source: 'import' as const, supplierCode: 'SUP-115', length: '150', width: '20', height: '20', createdAt: today(-50), updatedAt: today(), barcode: 'PR-2026-000009' },
  { id: uid(10), revit: 'KN-DRW-002', name: 'مقبض درج خشبي', type: 'part' as const, unit: 'pcs', qty: 300, min: 60, source: 'local' as const, supplierCode: '', length: '120', width: '25', height: '25', createdAt: today(-50), updatedAt: today(), barcode: 'PR-2026-000010' },
  { id: uid(11), revit: 'RG-SHF-001', name: 'رف سلكي مطلي', type: 'part' as const, unit: 'pcs', qty: 150, min: 30, source: 'local' as const, supplierCode: '', length: '900', width: '350', height: '40', createdAt: today(-48), updatedAt: today(), barcode: 'PR-2026-000011' },
  { id: uid(12), revit: 'RG-SHF-002', name: 'رف سلكي استانلس', type: 'part' as const, unit: 'pcs', qty: 100, min: 25, source: 'import' as const, supplierCode: 'SUP-336', length: '900', width: '350', height: '40', createdAt: today(-48), updatedAt: today(), barcode: 'PR-2026-000012' },
  { id: uid(13), revit: 'LG-SFT-001', name: 'مسار درج ناعم', type: 'part' as const, unit: 'pcs', qty: 90, min: 20, source: 'import' as const, supplierCode: 'SUP-447', length: '500', width: '45', height: '15', createdAt: today(-45), updatedAt: today(), barcode: 'PR-2026-000013' },
  { id: uid(14), revit: 'LG-SFT-002', name: 'مسار درج ثقيل', type: 'part' as const, unit: 'pcs', qty: 70, min: 15, source: 'import' as const, supplierCode: 'SUP-558', length: '600', width: '55', height: '20', createdAt: today(-45), updatedAt: today(), barcode: 'PR-2026-000014' },
  { id: uid(15), revit: 'FC-BRK-001', name: 'قدم أثاث قابل للتعديل', type: 'part' as const, unit: 'pcs', qty: 400, min: 80, source: 'import' as const, supplierCode: 'SUP-669', length: '60', width: '60', height: '100', createdAt: today(-42), updatedAt: today(), barcode: 'PR-2026-000015' },
  { id: uid(16), revit: 'FC-BRK-002', name: 'عجلة أثاث دوارة', type: 'part' as const, unit: 'pcs', qty: 250, min: 50, source: 'import' as const, supplierCode: 'SUP-771', length: '50', width: '50', height: '65', createdAt: today(-42), updatedAt: today(), barcode: 'PR-2026-000016' },
  { id: uid(17), revit: 'CP-EDG-001', name: 'شريط تغليف حافة أبيض', type: 'part' as const, unit: 'm', qty: 2000, min: 500, source: 'local' as const, supplierCode: '', length: '100000', width: '22', height: '2', createdAt: today(-40), updatedAt: today(), barcode: 'PR-2026-000017' },
  { id: uid(18), revit: 'CP-EDG-002', name: 'شريط تغليف حافة خشبي', type: 'part' as const, unit: 'm', qty: 1500, min: 400, source: 'local' as const, supplierCode: '', length: '100000', width: '22', height: '2', createdAt: today(-40), updatedAt: today(), barcode: 'PR-2026-000018' },
  { id: uid(19), revit: 'CN-PLC-001', name: 'لوح خشب MDF أبيض', type: 'part' as const, unit: 'pcs', qty: 180, min: 30, source: 'local' as const, supplierCode: '', length: '2800', width: '2070', height: '18', createdAt: today(-38), updatedAt: today(), barcode: 'PR-2026-000019' },
  { id: uid(20), revit: 'CN-PLC-002', name: 'لوح خشب HDF', type: 'part' as const, unit: 'pcs', qty: 120, min: 25, source: 'local' as const, supplierCode: '', length: '2800', width: '2070', height: '16', createdAt: today(-38), updatedAt: today(), barcode: 'PR-2026-000020' },
  { id: uid(21), revit: 'SC-ROD-001', name: 'قضيب ستارة معدني', type: 'part' as const, unit: 'pcs', qty: 55, min: 12, source: 'import' as const, supplierCode: 'SUP-992', length: '3000', width: '28', height: '28', createdAt: today(-35), updatedAt: today(), barcode: 'PR-2026-000021' },
  { id: uid(22), revit: 'SC-ROD-002', name: 'قضيب ستارة خشبي', type: 'part' as const, unit: 'pcs', qty: 40, min: 10, source: 'local' as const, supplierCode: '', length: '2500', width: '30', height: '30', createdAt: today(-35), updatedAt: today(), barcode: 'PR-2026-000022' },
  { id: uid(23), revit: 'LT-FXT-001', name: 'قاعدة إضاءة LED سقفية', type: 'part' as const, unit: 'pcs', qty: 75, min: 15, source: 'import' as const, supplierCode: 'SUP-113', length: '600', width: '600', height: '50', createdAt: today(-32), updatedAt: today(), barcode: 'PR-2026-000023' },
  { id: uid(24), revit: 'LT-FXT-002', name: 'سبوت لايت LED', type: 'part' as const, unit: 'pcs', qty: 100, min: 25, source: 'import' as const, supplierCode: 'SUP-224', length: '100', width: '100', height: '40', createdAt: today(-32), updatedAt: today(), barcode: 'PR-2026-000024' },
  { id: uid(25), revit: 'EL-OUT-001', name: 'فيش كهرباء ثلاثي', type: 'part' as const, unit: 'pcs', qty: 300, min: 60, source: 'import' as const, supplierCode: 'SUP-335', length: '86', width: '86', height: '35', createdAt: today(-30), updatedAt: today(), barcode: 'PR-2026-000025' },
  { id: uid(26), revit: 'EL-OUT-002', name: 'مفتاح إضاءة مزدوج', type: 'part' as const, unit: 'pcs', qty: 250, min: 50, source: 'import' as const, supplierCode: 'SUP-446', length: '86', width: '86', height: '25', createdAt: today(-30), updatedAt: today(), barcode: 'PR-2026-000026' },
  { id: uid(27), revit: 'PL-PIP-001', name: 'مواسير PVC 20mm', type: 'part' as const, unit: 'm', qty: 500, min: 100, source: 'local' as const, supplierCode: '', length: '4000', width: '20', height: '20', createdAt: today(-28), updatedAt: today(), barcode: 'PR-2026-000027' },
  { id: uid(28), revit: 'PL-PIP-002', name: 'مواسير PVC 32mm', type: 'part' as const, unit: 'm', qty: 350, min: 80, source: 'local' as const, supplierCode: '', length: '4000', width: '32', height: '32', createdAt: today(-28), updatedAt: today(), barcode: 'PR-2026-000028' },
  { id: uid(29), revit: 'TL-MRR-001', name: 'مرآة حمام مضيئة', type: 'part' as const, unit: 'pcs', qty: 35, min: 8, source: 'import' as const, supplierCode: 'SUP-557', length: '800', width: '600', height: '30', createdAt: today(-25), updatedAt: today(), barcode: 'PR-2026-000029' },
  { id: uid(30), revit: 'TL-MRR-002', name: 'مرآة ديكور كبيرة', type: 'part' as const, unit: 'pcs', qty: 20, min: 5, source: 'import' as const, supplierCode: 'SUP-668', length: '1800', width: '900', height: '25', createdAt: today(-25), updatedAt: today(), barcode: 'PR-2026-000030' },
  { id: uid(31), revit: 'TL-SNK-001', name: 'مغسلة سيراميك بيضاء', type: 'part' as const, unit: 'pcs', qty: 40, min: 10, source: 'local' as const, supplierCode: '', length: '600', width: '450', height: '200', createdAt: today(-22), updatedAt: today(), barcode: 'PR-2026-000031' },
  { id: uid(32), revit: 'TL-SNK-002', name: 'مغسلة رخامية', type: 'part' as const, unit: 'pcs', qty: 15, min: 5, source: 'import' as const, supplierCode: 'SUP-779', length: '700', width: '500', height: '180', createdAt: today(-22), updatedAt: today(), barcode: 'PR-2026-000032' },
  { id: uid(33), revit: 'TL-FCT-001', name: 'حنفية نحاسية', type: 'part' as const, unit: 'pcs', qty: 60, min: 15, source: 'import' as const, supplierCode: 'SUP-881', length: '150', width: '50', height: '200', createdAt: today(-20), updatedAt: today(), barcode: 'PR-2026-000033' },
  { id: uid(34), revit: 'TL-FCT-002', name: 'خلاط دش كروم', type: 'part' as const, unit: 'pcs', qty: 45, min: 12, source: 'import' as const, supplierCode: 'SUP-992', length: '120', width: '80', height: '150', createdAt: today(-20), updatedAt: today(), barcode: 'PR-2026-000034' },
  { id: uid(35), revit: 'KT-CTR-001', name: 'كونترتوب كوارتز أبيض', type: 'part' as const, unit: 'm2', qty: 50, min: 10, source: 'import' as const, supplierCode: 'SUP-114', length: '3000', width: '600', height: '30', createdAt: today(-18), updatedAt: today(), barcode: 'PR-2026-000035' },
  { id: uid(36), revit: 'KT-CTR-002', name: 'كونترتوب رخام أسود', type: 'part' as const, unit: 'm2', qty: 30, min: 8, source: 'import' as const, supplierCode: 'SUP-225', length: '3000', width: '600', height: '30', createdAt: today(-18), updatedAt: today(), barcode: 'PR-2026-000036' },
  { id: uid(37), revit: 'KT-BSN-001', name: 'حوض مطبخ استانلس عميق', type: 'part' as const, unit: 'pcs', qty: 35, min: 8, source: 'import' as const, supplierCode: 'SUP-336', length: '700', width: '450', height: '250', createdAt: today(-15), updatedAt: today(), barcode: 'PR-2026-000037' },
  { id: uid(38), revit: 'KT-BSN-002', name: 'حوض مطبخ مزدوج', type: 'part' as const, unit: 'pcs', qty: 25, min: 6, source: 'import' as const, supplierCode: 'SUP-447', length: '850', width: '480', height: '220', createdAt: today(-15), updatedAt: today(), barcode: 'PR-2026-000038' },
  { id: uid(39), revit: 'KT-GAS-001', name: 'موقد غاز 4 عيون', type: 'part' as const, unit: 'pcs', qty: 30, min: 8, source: 'import' as const, supplierCode: 'SUP-558', length: '600', width: '580', height: '80', createdAt: today(-12), updatedAt: today(), barcode: 'PR-2026-000039' },
  { id: uid(40), revit: 'KT-GAS-002', name: 'فرن كهربائي مدمج', type: 'part' as const, unit: 'pcs', qty: 22, min: 6, source: 'import' as const, supplierCode: 'SUP-669', length: '600', width: '580', height: '600', createdAt: today(-12), updatedAt: today(), barcode: 'PR-2026-000040' },
];

// ─── Tops (20 items) ───
const TOPS = [
  { id: uid(101), code: 'TP-QZ-001', name: 'كوارتز أبيض نقي', length: 3000, width: 600, thickness: 30, product: 'local' as const, supplierCode: undefined, localCode: undefined, createdAt: today(-60), updatedAt: today(), barcode: 'TP-2026-000001' },
  { id: uid(102), code: 'TP-QZ-002', name: 'كوارتز رمادي مرقش', length: 3000, width: 600, thickness: 30, product: 'import' as const, supplierCode: 'SUP-111', localCode: undefined, createdAt: today(-60), updatedAt: today(), barcode: 'TP-2026-000002' },
  { id: uid(103), code: 'TP-QZ-003', name: 'كوارتز بيج فاتح', length: 3000, width: 600, thickness: 30, product: 'local' as const, supplierCode: undefined, localCode: undefined, createdAt: today(-58), updatedAt: today(), barcode: 'TP-2026-000003' },
  { id: uid(104), code: 'TP-QZ-004', name: 'كوارتز أسود مطرق', length: 3000, width: 600, thickness: 30, product: 'import' as const, supplierCode: 'SUP-222', localCode: undefined, createdAt: today(-58), updatedAt: today(), barcode: 'TP-2026-000004' },
  { id: uid(105), code: 'TP-GR-001', name: 'جرانيت أحمر نيوهامشير', length: 3000, width: 600, thickness: 40, product: 'import' as const, supplierCode: 'SUP-333', localCode: undefined, createdAt: today(-55), updatedAt: today(), barcode: 'TP-2026-000005' },
  { id: uid(106), code: 'TP-GR-002', name: 'جرانيت أسود زنجبار', length: 3000, width: 600, thickness: 40, product: 'import' as const, supplierCode: 'SUP-444', localCode: undefined, createdAt: today(-55), updatedAt: today(), barcode: 'TP-2026-000006' },
  { id: uid(107), code: 'TP-MR-001', name: 'رخام كارارا أبيض', length: 3000, width: 600, thickness: 40, product: 'import' as const, supplierCode: 'SUP-555', localCode: undefined, createdAt: today(-52), updatedAt: today(), barcode: 'TP-2026-000007' },
  { id: uid(108), code: 'TP-MR-002', name: 'رخام إمبيرادور بني', length: 3000, width: 600, thickness: 40, product: 'import' as const, supplierCode: 'SUP-666', localCode: undefined, createdAt: today(-52), updatedAt: today(), barcode: 'TP-2026-000008' },
  { id: uid(109), code: 'TP-MR-003', name: 'رخام كالاكاتا', length: 3000, width: 600, thickness: 35, product: 'import' as const, supplierCode: 'SUP-777', localCode: undefined, createdAt: today(-50), updatedAt: today(), barcode: 'TP-2026-000009' },
  { id: uid(110), code: 'TP-CL-001', name: 'صلب لامينيت أبيض', length: 3000, width: 600, thickness: 12, product: 'local' as const, supplierCode: undefined, localCode: undefined, createdAt: today(-50), updatedAt: today(), barcode: 'TP-2026-000010' },
  { id: uid(111), code: 'TP-CL-002', name: 'صلب لامينيت خشبي', length: 3000, width: 600, thickness: 12, product: 'local' as const, supplierCode: undefined, localCode: undefined, createdAt: today(-48), updatedAt: today(), barcode: 'TP-2026-000011' },
  { id: uid(112), code: 'TP-SS-001', name: 'ستانلس ستيل ناعم', length: 3000, width: 600, thickness: 20, product: 'import' as const, supplierCode: 'SUP-888', localCode: undefined, createdAt: today(-48), updatedAt: today(), barcode: 'TP-2026-000012' },
  { id: uid(113), code: 'TP-SS-002', name: 'ستانلس ستيل مصفح', length: 3000, width: 600, thickness: 20, product: 'import' as const, supplierCode: 'SUP-999', localCode: undefined, createdAt: today(-45), updatedAt: today(), barcode: 'TP-2026-000013' },
  { id: uid(114), code: 'TP-TR-001', name: 'ترافرتين كلاسيك', length: 3000, width: 600, thickness: 35, product: 'import' as const, supplierCode: 'SUP-101', localCode: undefined, createdAt: today(-45), updatedAt: today(), barcode: 'TP-2026-000014' },
  { id: uid(115), code: 'TP-TR-002', name: 'ترافرتين روماني', length: 3000, width: 600, thickness: 35, product: 'import' as const, supplierCode: 'SUP-202', localCode: undefined, createdAt: today(-42), updatedAt: today(), barcode: 'TP-2026-000015' },
  { id: uid(116), code: 'TP-ON-001', name: 'أونيكس شفاف عقيقي', length: 3000, width: 600, thickness: 30, product: 'import' as const, supplierCode: 'SUP-303', localCode: undefined, createdAt: today(-42), updatedAt: today(), barcode: 'TP-2026-000016' },
  { id: uid(117), code: 'TP-WD-001', name: 'خشب بلوط طبيعي', length: 3000, width: 600, thickness: 40, product: 'local' as const, supplierCode: undefined, localCode: undefined, createdAt: today(-40), updatedAt: today(), barcode: 'TP-2026-000017' },
  { id: uid(118), code: 'TP-WD-002', name: 'خشب جوز أمريكي', length: 3000, width: 600, thickness: 40, product: 'import' as const, supplierCode: 'SUP-404', localCode: undefined, createdAt: today(-40), updatedAt: today(), barcode: 'TP-2026-000018' },
  { id: uid(119), code: 'TP-CE-001', name: 'سيراميك بورسلان أبيض', length: 3000, width: 600, thickness: 12, product: 'local' as const, supplierCode: undefined, localCode: undefined, createdAt: today(-38), updatedAt: today(), barcode: 'TP-2026-000019' },
  { id: uid(120), code: 'TP-CE-002', name: 'سيراميك بورسلان رخامي', length: 3000, width: 600, thickness: 12, product: 'import' as const, supplierCode: 'SUP-505', localCode: undefined, createdAt: today(-38), updatedAt: today(), barcode: 'TP-2026-000020' },
];

// ─── Accessories (25 items) ───
const ACCESSORIES = [
  { id: uid(201), code: 'ACC-SCR-001', name: 'براغي استانلس M4', type: 'accessory' as const, unit: 'box', createdAt: today(-60), updatedAt: today(), barcode: 'AC-2026-000001' },
  { id: uid(202), code: 'ACC-SCR-002', name: 'براغي استانلس M6', type: 'accessory' as const, unit: 'box', createdAt: today(-60), updatedAt: today(), barcode: 'AC-2026-000002' },
  { id: uid(203), code: 'ACC-NUT-001', name: 'صواميل معدنية M4', type: 'accessory' as const, unit: 'box', createdAt: today(-58), updatedAt: today(), barcode: 'AC-2026-000003' },
  { id: uid(204), code: 'ACC-NUT-002', name: 'صواميل معدنية M6', type: 'accessory' as const, unit: 'box', createdAt: today(-58), updatedAt: today(), barcode: 'AC-2026-000004' },
  { id: uid(205), code: 'ACC-WAS-001', name: 'واشر مطاطي', type: 'accessory' as const, unit: 'pcs', createdAt: today(-55), updatedAt: today(), barcode: 'AC-2026-000005' },
  { id: uid(206), code: 'ACC-WAS-002', name: 'واشر معدني مسطح', type: 'accessory' as const, unit: 'pcs', createdAt: today(-55), updatedAt: today(), barcode: 'AC-2026-000006' },
  { id: uid(207), code: 'ACC-GLU-001', name: 'غراء خشب مقاوم للماء', type: 'accessory' as const, unit: 'bottle', createdAt: today(-52), updatedAt: today(), barcode: 'AC-2026-000007' },
  { id: uid(208), code: 'ACC-GLU-002', name: 'غراء سيليكون شفاف', type: 'accessory' as const, unit: 'tube', createdAt: today(-52), updatedAt: today(), barcode: 'AC-2026-000008' },
  { id: uid(209), code: 'ACC-TAP-001', name: 'شريط لاصق ألومنيوم', type: 'accessory' as const, unit: 'roll', createdAt: today(-50), updatedAt: today(), barcode: 'AC-2026-000009' },
  { id: uid(210), code: 'ACC-TAP-002', name: 'شريط لاصق PVC', type: 'accessory' as const, unit: 'roll', createdAt: today(-50), updatedAt: today(), barcode: 'AC-2026-000010' },
  { id: uid(211), code: 'ACC-FOA-001', name: 'فوم مانع تسرب', type: 'accessory' as const, unit: 'roll', createdAt: today(-48), updatedAt: today(), barcode: 'AC-2026-000011' },
  { id: uid(212), code: 'ACC-SEAL-001', name: 'مانع تسرب سيليكون', type: 'accessory' as const, unit: 'tube', createdAt: today(-48), updatedAt: today(), barcode: 'AC-2026-000012' },
  { id: uid(213), code: 'ACC-DOW-001', name: 'دبل فيس شفط قوي', type: 'accessory' as const, unit: 'roll', createdAt: today(-45), updatedAt: today(), barcode: 'AC-2026-000013' },
  { id: uid(214), code: 'ACC-CAB-001', name: 'كابلات كهرباء 2.5mm', type: 'accessory' as const, unit: 'm', createdAt: today(-45), updatedAt: today(), barcode: 'AC-2026-000014' },
  { id: uid(215), code: 'ACC-CAB-002', name: 'كابلات كهرباء 4mm', type: 'accessory' as const, unit: 'm', createdAt: today(-42), updatedAt: today(), barcode: 'AC-2026-000015' },
  { id: uid(216), code: 'ACC-CON-001', name: 'وصلات كهرباء طرفية', type: 'accessory' as const, unit: 'box', createdAt: today(-42), updatedAt: today(), barcode: 'AC-2026-000016' },
  { id: uid(217), code: 'ACC-PIN-001', name: 'دبابيس تنجيد', type: 'accessory' as const, unit: 'box', createdAt: today(-40), updatedAt: today(), barcode: 'AC-2026-000017' },
  { id: uid(218), code: 'ACC-ZIP-001', name: 'رباط كيبل نايلون', type: 'accessory' as const, unit: 'pack', createdAt: today(-40), updatedAt: today(), barcode: 'AC-2026-000018' },
  { id: uid(219), code: 'ACC-LAB-001', name: 'ملصقات توضيحية', type: 'accessory' as const, unit: 'sheet', createdAt: today(-38), updatedAt: today(), barcode: 'AC-2026-000019' },
  { id: uid(220), code: 'ACC-POL-001', name: 'ملمع أخشاب', type: 'accessory' as const, unit: 'bottle', createdAt: today(-38), updatedAt: today(), barcode: 'AC-2026-000020' },
  { id: uid(221), code: 'ACC-VAR-001', name: 'ورنيش حماية شفاف', type: 'accessory' as const, unit: 'can', createdAt: today(-35), updatedAt: today(), barcode: 'AC-2026-000021' },
  { id: uid(222), code: 'ACC-FEL-001', name: 'لحام شمع أبيض', type: 'accessory' as const, unit: 'stick', createdAt: today(-35), updatedAt: today(), barcode: 'AC-2026-000022' },
  { id: uid(223), code: 'ACC-FEE-001', name: 'شمع ختم أحمر', type: 'accessory' as const, unit: 'stick', createdAt: today(-32), updatedAt: today(), barcode: 'AC-2026-000023' },
  { id: uid(224), code: 'ACC-SAN-001', name: 'ورق صنفرة 120', type: 'accessory' as const, unit: 'sheet', createdAt: today(-32), updatedAt: today(), barcode: 'AC-2026-000024' },
  { id: uid(225), code: 'ACC-SAN-002', name: 'ورق صنفرة 240', type: 'accessory' as const, unit: 'sheet', createdAt: today(-30), updatedAt: today(), barcode: 'AC-2026-000025' },
];

// ─── Projects (7 items) ───
const PROJECTS = [
  { id: uid(301), code: 'PRJ-2024-001', name: 'فلل الساحل الشمالي', client: 'شركة بالم هيلز', buildings: [{ id: uid(3011), name: 'مبنى أ', floors: [{ name: 'طابق 1', source: 'local' as const }, { name: 'طابق 2', source: 'local' as const }, { name: 'طابق 3', source: 'import' as const }] }, { id: uid(3012), name: 'مبنى ب', floors: [{ name: 'طابق 1', source: 'local' as const }, { name: 'طابق 2', source: 'import' as const }] }], createdAt: today(-90), updatedAt: today() },
  { id: uid(302), code: 'PRJ-2024-002', name: 'برج الأعمال المركزي', client: 'شركة طلعت مصطفى', buildings: [{ id: uid(3021), name: 'البرج الرئيسي', floors: [{ name: 'طابق 1', source: 'local' as const }, { name: 'طابق 2', source: 'local' as const }, { name: 'طابق 3', source: 'local' as const }, { name: 'طابق 4', source: 'import' as const }, { name: 'طابق 5', source: 'import' as const }] }], createdAt: today(-80), updatedAt: today() },
  { id: uid(303), code: 'PRJ-2024-003', name: 'كمبوند جاردينيا', client: 'شركة إعمار', buildings: [{ id: uid(3031), name: 'مبنى 1', floors: [{ name: 'طابق أرضي', source: 'local' as const }, { name: 'طابق 1', source: 'local' as const }, { name: 'طابق 2', source: 'import' as const }] }, { id: uid(3032), name: 'مبنى 2', floors: [{ name: 'طابق أرضي', source: 'local' as const }, { name: 'طابق 1', source: 'local' as const }] }], createdAt: today(-75), updatedAt: today() },
  { id: uid(304), code: 'PRJ-2024-004', name: 'منتجع هيلتون الغردقة', client: 'فنادق هيلتون', buildings: [{ id: uid(3041), name: 'المبنى الرئيسي', floors: [{ name: 'طابق 1', source: 'import' as const }, { name: 'طابق 2', source: 'import' as const }, { name: 'طابق 3', source: 'local' as const }] }, { id: uid(3042), name: 'المبنى الجنوبي', floors: [{ name: 'طابق 1', source: 'local' as const }, { name: 'طابق 2', source: 'local' as const }] }], createdAt: today(-70), updatedAt: today() },
  { id: uid(305), code: 'PRJ-2024-005', name: 'مجمع مدارس النخبة', client: 'مؤسسة التعليم الدولي', buildings: [{ id: uid(3051), name: 'مبنى الصف الابتدائي', floors: [{ name: 'طابق أرضي', source: 'local' as const }, { name: 'طابق 1', source: 'local' as const }] }, { id: uid(3052), name: 'مبنى الصف الثانوي', floors: [{ name: 'طابق أرضي', source: 'local' as const }, { name: 'طابق 1', source: 'import' as const }, { name: 'طابق 2', source: 'import' as const }] }], createdAt: today(-65), updatedAt: today() },
  { id: uid(306), code: 'PRJ-2024-006', name: 'مستشفى الأمل التخصصي', client: 'وزارة الصحة', buildings: [{ id: uid(3061), name: 'المبنى الطبي', floors: [{ name: 'الطابق الأرضي', source: 'local' as const }, { name: 'طابق 1', source: 'import' as const }, { name: 'طابق 2', source: 'import' as const }, { name: 'طابق 3', source: 'import' as const }] }], createdAt: today(-60), updatedAt: today() },
  { id: uid(307), code: 'PRJ-2024-007', name: 'مول الشرق التجاري', client: 'شركة القاهرة للتطوير', buildings: [{ id: uid(3071), name: 'المول الرئيسي', floors: [{ name: 'الدور الأرضي', source: 'local' as const }, { name: 'طابق 1', source: 'local' as const }, { name: 'طابق 2', source: 'import' as const }] }, { id: uid(3072), name: 'المول الغربي', floors: [{ name: 'الدور الأرضي', source: 'local' as const }, { name: 'طابق 1', source: 'local' as const }] }], createdAt: today(-55), updatedAt: today() },
];

// ─── Containers (7 items) WITH project, destination, date ───
const CONTAINERS = [
  { id: uid(401), number: 'CNT-2024-001', source: 'local' as const, project: 'PRJ-2024-001', destination: 'الساحل الشمالي', date: today(-30), notes: 'محلي — تسليم كامل', boxes: [] as string[], pallets: [] as string[], createdAt: today(-35) },
  { id: uid(402), number: 'CNT-2024-002', source: 'import' as const, project: 'PRJ-2024-002', destination: 'القاهرة الجديدة', date: today(-25), notes: 'استيراد من إيطاليا', boxes: [] as string[], pallets: [] as string[], createdAt: today(-30) },
  { id: uid(403), number: 'CNT-2024-003', source: 'local' as const, project: 'PRJ-2024-003', destination: 'العاصمة الإدارية', date: today(-15), notes: 'شحنة محلية', boxes: [] as string[], pallets: [] as string[], createdAt: today(-20) },
  { id: uid(404), number: 'CNT-2024-004', source: 'import' as const, project: 'PRJ-2024-004', destination: 'الغردقة', date: today(-10), notes: 'استيراد من الصين', boxes: [] as string[], pallets: [] as string[], createdAt: today(-15) },
  { id: uid(405), number: 'CNT-2024-005', source: 'local' as const, project: 'PRJ-2024-005', destination: '6 أكتوبر', date: today(-5), notes: 'قيد التجهيز', boxes: [] as string[], pallets: [] as string[], createdAt: today(-8) },
  { id: uid(406), number: 'CNT-2024-006', source: 'import' as const, project: 'PRJ-2024-006', destination: 'مدينة نصر', date: today(-3), notes: 'وارد أوروبا', boxes: [] as string[], pallets: [] as string[], createdAt: today(-5) },
  { id: uid(407), number: 'CNT-2024-007', source: 'local' as const, project: 'PRJ-2024-007', destination: 'القاهرة', date: today(-1), notes: 'محلي', boxes: [] as string[], pallets: [] as string[], createdAt: today(-3) },
];

// ─── Pallets (10 items) ───
const PALLETS = [
  { id: uid(501), number: 'PLT-2024-001', source: 'local' as const, boxes: [] as string[], createdAt: today(-25) },
  { id: uid(502), number: 'PLT-2024-002', source: 'import' as const, boxes: [] as string[], createdAt: today(-22) },
  { id: uid(503), number: 'PLT-2024-003', source: 'local' as const, boxes: [] as string[], createdAt: today(-18) },
  { id: uid(504), number: 'PLT-2024-004', source: 'local' as const, boxes: [] as string[], createdAt: today(-15) },
  { id: uid(505), number: 'PLT-2024-005', source: 'import' as const, boxes: [] as string[], createdAt: today(-12) },
  { id: uid(506), number: 'PLT-2024-006', source: 'local' as const, boxes: [] as string[], createdAt: today(-10) },
  { id: uid(507), number: 'PLT-2024-007', source: 'import' as const, boxes: [] as string[], createdAt: today(-8) },
  { id: uid(508), number: 'PLT-2024-008', source: 'local' as const, boxes: [] as string[], createdAt: today(-6) },
  { id: uid(509), number: 'PLT-2024-009', source: 'local' as const, boxes: [] as string[], createdAt: today(-4) },
  { id: uid(510), number: 'PLT-2024-010', source: 'import' as const, boxes: [] as string[], createdAt: today(-2) },
];

// ─── Products (15 items) WITH complete components ───
// Product IDs start at 601
function pc(id: number, code: string, name: string, qty: number, compType: 'part' | 'accessory' | 'top') {
  return { id: uid(id + 7000), code, name, qty, compType };
}

const PRODUCTS = [
  {
    id: uid(601), code: 'PROD-DR-001', name: 'وحدة خزانة ملابس كاملة', dim: { l: '2400', w: '600', h: '2200' }, weight: '85',
    components: [
      pc(1, 'WL-CNC-001', 'لوح CNC جدار أبيض', 4, 'part'),
      pc(2, 'DR-SLD-001', 'باب سحاب ألومنيوم', 2, 'part'),
      pc(3, 'HD-HNG-001', 'مفصلة باب ثقيلة', 6, 'part'),
      pc(4, 'LG-SFT-001', 'مسار درج ناعم', 3, 'part'),
      pc(5, 'RG-SHF-001', 'رف سلكي مطلي', 4, 'part'),
      pc(6, 'ACC-SCR-001', 'براغي استانلس M4', 2, 'accessory'),
      pc(7, 'TP-QZ-001', 'كوارتز أبيض نقي', 1, 'top'),
    ],
    createdAt: today(-45), updatedAt: today(), barcode: 'PD-2026-000001' },
  {
    id: uid(602), code: 'PROD-DR-002', name: 'وحدة خزانة أحذية', dim: { l: '1200', w: '400', h: '900' }, weight: '35',
    components: [
      pc(8, 'WL-CNC-002', 'لوح CNC جدار بيج', 3, 'part'),
      pc(9, 'HD-HNG-002', 'مفصلة باب خفيفة', 2, 'part'),
      pc(10, 'RG-SHF-002', 'رف سلكي استانلس', 3, 'part'),
      pc(11, 'ACC-SCR-002', 'براغي استانلس M6', 1, 'accessory'),
    ],
    createdAt: today(-42), updatedAt: today(), barcode: 'PD-2026-000002' },
  {
    id: uid(603), code: 'PROD-KT-001', name: 'مطبخ أمريكي مدمج', dim: { l: '3600', w: '600', h: '900' }, weight: '120',
    components: [
      pc(12, 'CN-PLC-001', 'لوح خشب MDF أبيض', 6, 'part'),
      pc(13, 'LG-SFT-002', 'مسار درج ثقيل', 4, 'part'),
      pc(14, 'KN-DRW-001', 'مقبض درج استانلس', 8, 'part'),
      pc(15, 'CP-EDG-001', 'شريط تغليف حافة أبيض', 8, 'part'),
      pc(16, 'ACC-GLU-001', 'غراء خشب مقاوم للماء', 3, 'accessory'),
      pc(17, 'ACC-TAP-001', 'شريط لاصق ألومنيوم', 2, 'accessory'),
      pc(18, 'TP-GR-001', 'جرانيت أحمر نيوهامشير', 1, 'top'),
      pc(19, 'KT-GAS-001', 'موقد غاز 4 عيون', 1, 'part'),
    ],
    createdAt: today(-40), updatedAt: today(), barcode: 'PD-2026-000003' },
  {
    id: uid(604), code: 'PROD-KT-002', name: 'جزيرة مطبخ مركزية', dim: { l: '2400', w: '900', h: '900' }, weight: '95',
    components: [
      pc(20, 'CN-PLC-002', 'لوح خشب HDF', 4, 'part'),
      pc(21, 'KT-CTR-001', 'كونترتوب كوارتز أبيض', 1, 'part'),
      pc(22, 'KT-BSN-001', 'حوض مطبخ استانلس عميق', 1, 'part'),
      pc(23, 'TL-FCT-001', 'حنفية نحاسية', 1, 'part'),
      pc(24, 'ACC-GLU-002', 'غراء سيليكون شفاف', 2, 'accessory'),
      pc(25, 'TP-MR-001', 'رخام كارارا أبيض', 1, 'top'),
    ],
    createdAt: today(-38), updatedAt: today(), barcode: 'PD-2026-000004' },
  {
    id: uid(605), code: 'PROD-BR-001', name: 'وحدة حمام رئيسية', dim: { l: '1500', w: '600', h: '850' }, weight: '55',
    components: [
      pc(26, 'TL-SNK-001', 'مغسلة سيراميك بيضاء', 1, 'part'),
      pc(27, 'TL-MRR-001', 'مرآة حمام مضيئة', 1, 'part'),
      pc(28, 'TL-FCT-002', 'خلاط دش كروم', 2, 'part'),
      pc(29, 'CP-EDG-002', 'شريط تغليف حافة خشبي', 3, 'part'),
      pc(30, 'ACC-SEAL-001', 'مانع تسرب سيليكون', 3, 'accessory'),
      pc(31, 'TP-QZ-003', 'كوارتز بيج فاتح', 1, 'top'),
    ],
    createdAt: today(-36), updatedAt: today(), barcode: 'PD-2026-000005' },
  {
    id: uid(606), code: 'PROD-BR-002', name: 'وحدة حمام ضيوف', dim: { l: '900', w: '500', h: '850' }, weight: '40',
    components: [
      pc(32, 'TL-SNK-002', 'مغسلة رخامية', 1, 'part'),
      pc(33, 'TL-FCT-001', 'حنفية نحاسية', 1, 'part'),
      pc(34, 'TL-MRR-002', 'مرآة ديكور كبيرة', 1, 'part'),
      pc(35, 'ACC-FOA-001', 'فوم مانع تسرب', 2, 'accessory'),
    ],
    createdAt: today(-34), updatedAt: today(), barcode: 'PD-2026-000006' },
  {
    id: uid(607), code: 'PROD-LV-001', name: 'وحدة تلفزيون معيشة', dim: { l: '3000', w: '450', h: '600' }, weight: '65',
    components: [
      pc(36, 'CN-PLC-001', 'لوح خشب MDF أبيض', 4, 'part'),
      pc(37, 'LG-SFT-001', 'مسار درج ناعم', 2, 'part'),
      pc(38, 'LT-FXT-002', 'سبوت لايت LED', 4, 'part'),
      pc(39, 'EL-OUT-001', 'فيش كهرباء ثلاثي', 2, 'part'),
      pc(40, 'ACC-CAB-001', 'كابلات كهرباء 2.5mm', 5, 'accessory'),
      pc(41, 'TP-CL-001', 'صلب لامينيت أبيض', 1, 'top'),
    ],
    createdAt: today(-32), updatedAt: today(), barcode: 'PD-2026-000007' },
  {
    id: uid(608), code: 'PROD-LV-002', name: 'طاولة قهوة مركزية', dim: { l: '1200', w: '600', h: '450' }, weight: '25',
    components: [
      pc(42, 'CN-PLC-001', 'لوح خشب MDF أبيض', 2, 'part'),
      pc(43, 'FC-BRK-001', 'قدم أثاث قابل للتعديل', 4, 'part'),
      pc(44, 'ACC-VAR-001', 'ورنيش حماية شفاف', 2, 'accessory'),
      pc(45, 'TP-WD-001', 'خشب بلوط طبيعي', 1, 'top'),
    ],
    createdAt: today(-30), updatedAt: today(), barcode: 'PD-2026-000008' },
  {
    id: uid(609), code: 'PROD-BD-001', name: 'سرير ماستر مع لوح رأسي', dim: { l: '1800', w: '2000', h: '1200' }, weight: '75',
    components: [
      pc(46, 'CN-PLC-002', 'لوح خشب HDF', 5, 'part'),
      pc(47, 'HD-HNG-002', 'مفصلة باب خفيفة', 2, 'part'),
      pc(48, 'SL-GLD-001', 'قضيب تعليق سقفي', 1, 'part'),
      pc(49, 'ACC-POL-001', 'ملمع أخشاب', 1, 'accessory'),
      pc(50, 'ACC-DOW-001', 'دبل فيس شفط قوي', 1, 'accessory'),
      pc(51, 'TP-MR-002', 'رخام إمبيرادور بني', 1, 'top'),
    ],
    createdAt: today(-28), updatedAt: today(), barcode: 'PD-2026-000009' },
  {
    id: uid(610), code: 'PROD-BD-002', name: 'سرير أطفال مزدوج', dim: { l: '1200', w: '2000', h: '1000' }, weight: '50',
    components: [
      pc(52, 'CN-PLC-001', 'لوح خشب MDF أبيض', 4, 'part'),
      pc(53, 'FC-BRK-002', 'عجلة أثاث دوارة', 4, 'part'),
      pc(54, 'KN-DRW-002', 'مقبض درج خشبي', 2, 'part'),
      pc(55, 'ACC-GLU-001', 'غراء خشب مقاوم للماء', 1, 'accessory'),
    ],
    createdAt: today(-26), updatedAt: today(), barcode: 'PD-2026-000010' },
  {
    id: uid(611), code: 'PROD-OF-001', name: 'مكتب إداري مع خزانة', dim: { l: '1800', w: '750', h: '750' }, weight: '45',
    components: [
      pc(56, 'CN-PLC-001', 'لوح خشب MDF أبيض', 4, 'part'),
      pc(57, 'LG-SFT-001', 'مسار درج ناعم', 3, 'part'),
      pc(58, 'EL-OUT-002', 'مفتاح إضاءة مزدوج', 1, 'part'),
      pc(59, 'ACC-CAB-002', 'كابلات كهرباء 4mm', 3, 'accessory'),
      pc(60, 'ACC-CON-001', 'وصلات كهرباء طرفية', 1, 'accessory'),
      pc(61, 'TP-SS-001', 'ستانلس ستيل ناعم', 1, 'top'),
    ],
    createdAt: today(-24), updatedAt: today(), barcode: 'PD-2026-000011' },
  {
    id: uid(612), code: 'PROD-OF-002', name: 'وحدة أرفف مكتبية', dim: { l: '1200', w: '400', h: '2000' }, weight: '35',
    components: [
      pc(62, 'CN-PLC-002', 'لوح خشب HDF', 6, 'part'),
      pc(63, 'RG-SHF-001', 'رف سلكي مطلي', 5, 'part'),
      pc(64, 'SL-GLD-002', 'قضيب تعليق جداري', 1, 'part'),
      pc(65, 'ACC-SCR-001', 'براغي استانلس M4', 2, 'accessory'),
    ],
    createdAt: today(-22), updatedAt: today(), barcode: 'PD-2026-000012' },
  {
    id: uid(613), code: 'PROD-DN-001', name: 'طاولة طعام 8 كراسي', dim: { l: '2400', w: '1100', h: '760' }, weight: '90',
    components: [
      pc(66, 'CN-PLC-002', 'لوح خشب HDF', 3, 'part'),
      pc(67, 'FC-BRK-001', 'قدم أثاث قابل للتعديل', 8, 'part'),
      pc(68, 'ACC-VAR-001', 'ورنيش حماية شفاف', 2, 'accessory'),
      pc(69, 'ACC-SAN-001', 'ورق صنفرة 120', 3, 'accessory'),
      pc(70, 'TP-WD-002', 'خشب جوز أمريكي', 1, 'top'),
    ],
    createdAt: today(-20), updatedAt: today(), barcode: 'PD-2026-000013' },
  {
    id: uid(614), code: 'PROD-DN-002', name: 'بوفيه خدمة جانبي', dim: { l: '1800', w: '500', h: '900' }, weight: '55',
    components: [
      pc(71, 'CN-PLC-001', 'لوح خشب MDF أبيض', 4, 'part'),
      pc(72, 'LG-SFT-002', 'مسار درج ثقيل', 2, 'part'),
      pc(73, 'KN-DRW-001', 'مقبض درج استانلس', 4, 'part'),
      pc(74, 'CP-EDG-001', 'شريط تغليف حافة أبيض', 5, 'part'),
      pc(75, 'ACC-GLU-001', 'غراء خشب مقاوم للماء', 1, 'accessory'),
      pc(76, 'TP-QZ-002', 'كوارتز رمادي مرقش', 1, 'top'),
    ],
    createdAt: today(-18), updatedAt: today(), barcode: 'PD-2026-000014' },
  {
    id: uid(615), code: 'PROD-EN-001', name: 'خزانة أحذية مدخل', dim: { l: '1000', w: '350', h: '1200' }, weight: '30',
    components: [
      pc(77, 'CN-PLC-002', 'لوح خشب HDF', 3, 'part'),
      pc(78, 'DR-SLD-002', 'باب سحاب زجاجي', 1, 'part'),
      pc(79, 'RG-SHF-002', 'رف سلكي استانلس', 4, 'part'),
      pc(80, 'ACC-TAP-002', 'شريط لاصق PVC', 1, 'accessory'),
      pc(81, 'TP-CE-001', 'سيراميك بورسلان أبيض', 1, 'top'),
    ],
    createdAt: today(-16), updatedAt: today(), barcode: 'PD-2026-000015' },
];

// ─── Batches (10 items) — with name, deliveryDate, extra items ───
const BATCHES = [
  { id: uid(701), projectId: uid(301), projectName: 'فلل الساحل الشمالي', name: 'دفعة 1 — تسليم مايو', deliveryDate: today(-10), source: 'local' as const, status: 'تم' as const, prods: [{ id: uid(601), name: 'وحدة خزانة ملابس كاملة', code: 'PROD-DR-001', qty: 3 }, { id: uid(602), name: 'وحدة خزانة أحذية', code: 'PROD-DR-002', qty: 2 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-30), updatedAt: today() },
  { id: uid(702), projectId: uid(301), projectName: 'فلل الساحل الشمالي', name: 'دفعة 2 — تسليم يونيو', deliveryDate: today(+15), source: 'local' as const, status: 'قيد التجهيز' as const, prods: [{ id: uid(601), name: 'وحدة خزانة ملابس كاملة', code: 'PROD-DR-001', qty: 3 }, { id: uid(603), name: 'مطبخ أمريكي مدمج', code: 'PROD-KT-001', qty: 1 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-28), updatedAt: today() },
  { id: uid(703), projectId: uid(302), projectName: 'برج الأعمال المركزي', name: 'دفعة 1 — استيراد', deliveryDate: today(+30), source: 'import' as const, status: 'قيد التجهيز' as const, prods: [{ id: uid(607), name: 'وحدة تلفزيون معيشة', code: 'PROD-LV-001', qty: 5 }, { id: uid(611), name: 'مكتب إداري مع خزانة', code: 'PROD-OF-001', qty: 3 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-20), updatedAt: today() },
  { id: uid(704), projectId: uid(303), projectName: 'كمبوند جاردينيا', name: 'دفعة 1 — محلي', deliveryDate: today(+20), source: 'local' as const, status: 'جديد' as const, prods: [{ id: uid(605), name: 'وحدة حمام رئيسية', code: 'PROD-BR-001', qty: 4 }, { id: uid(606), name: 'وحدة حمام ضيوف', code: 'PROD-BR-002', qty: 2 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-18), updatedAt: today() },
  { id: uid(705), projectId: uid(303), projectName: 'كمبوند جاردينيا', name: 'دفعة 2 — استيراد', deliveryDate: today(+45), source: 'import' as const, status: 'جديد' as const, prods: [{ id: uid(609), name: 'سرير ماستر مع لوح رأسي', code: 'PROD-BD-001', qty: 2 }, { id: uid(610), name: 'سرير أطفال مزدوج', code: 'PROD-BD-002', qty: 2 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-15), updatedAt: today() },
  { id: uid(706), projectId: uid(304), projectName: 'منتجع هيلتون الغردقة', name: 'دفعة 1 — استيراد', deliveryDate: today(+60), source: 'import' as const, status: 'قيد التجهيز' as const, prods: [{ id: uid(613), name: 'طاولة طعام 8 كراسي', code: 'PROD-DN-001', qty: 2 }, { id: uid(614), name: 'بوفيه خدمة جانبي', code: 'PROD-DN-002', qty: 2 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-12), updatedAt: today() },
  { id: uid(707), projectId: uid(305), projectName: 'مجمع مدارس النخبة', name: 'دفعة 1 — محلي', deliveryDate: today(+25), source: 'local' as const, status: 'جديد' as const, prods: [{ id: uid(612), name: 'وحدة أرفف مكتبية', code: 'PROD-OF-002', qty: 6 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-10), updatedAt: today() },
  { id: uid(708), projectId: uid(306), projectName: 'مستشفى الأمل التخصصي', name: 'دفعة 1 — استيراد', deliveryDate: today(+40), source: 'import' as const, status: 'قيد التجهيز' as const, prods: [{ id: uid(603), name: 'مطبخ أمريكي مدمج', code: 'PROD-KT-001', qty: 3 }, { id: uid(604), name: 'جزيرة مطبخ مركزية', code: 'PROD-KT-002', qty: 1 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-8), updatedAt: today() },
  { id: uid(709), projectId: uid(307), projectName: 'مول الشرق التجاري', name: 'دفعة 1 — محلي', deliveryDate: today(+10), source: 'local' as const, status: 'جديد' as const, prods: [{ id: uid(615), name: 'خزانة أحذية مدخل', code: 'PROD-EN-001', qty: 8 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-5), updatedAt: today() },
  { id: uid(710), projectId: uid(301), projectName: 'فلل الساحل الشمالي', name: 'دفعة 3 — محلي', deliveryDate: today(+50), source: 'local' as const, status: 'جديد' as const, prods: [{ id: uid(601), name: 'وحدة خزانة ملابس كاملة', code: 'PROD-DR-001', qty: 4 }, { id: uid(608), name: 'طاولة قهوة مركزية', code: 'PROD-LV-002', qty: 2 }], extraParts: [], extraAccessories: [], extraTops: [], createdAt: today(-3), updatedAt: today() },
];

// ─── Movements (30 items) ───
const MOV_TYPES: ('in' | 'out' | 'adj' | 'return')[] = ['in', 'out', 'adj', 'return'];
const REASONS = ['استلام من مورد', 'صرف لإنتاج', 'تعديل جرد', 'إرجاع من مشروع', 'تحويل بين مستودعات', 'هالك'];
const MOVEMENTS = Array.from({ length: 30 }, (_, i) => {
  const partIdx = i % PARTS.length;
  const part = PARTS[partIdx];
  return {
    id: uid(801 + i),
    partId: part.id,
    partName: part.name,
    partType: part.type,
    type: MOV_TYPES[i % MOV_TYPES.length],
    qty: 5 + (i % 20) * 3,
    reason: REASONS[i % REASONS.length],
    source: 'manual' as const,
    afterQty: part.qty + (i % 10 - 5),
    date: today(-30 + i),
    createdAt: today(-30 + i),
  };
});

// ─── Boxes (12 items) ───
const BOX_TYPES = ['شحن', 'Wooden', 'Carton', 'عربة'];
const BOXES = [
  { id: uid(901), num: 'BOX-2024001', type: BOX_TYPES[0], wgt: '120', bldg: 'أ', flr: '1', notes: 'عناية خاصة', prods: [{ id: uid(601), name: 'وحدة خزانة ملابس كاملة', code: 'PROD-DR-001', qty: 2 }, { id: uid(602), name: 'وحدة خزانة أحذية', code: 'PROD-DR-002', qty: 1 }], containerId: uid(401), createdAt: today(-28) },
  { id: uid(902), num: 'BOX-2024002', type: BOX_TYPES[1], wgt: '85', bldg: 'أ', flr: '2', notes: undefined, prods: [{ id: uid(603), name: 'مطبخ أمريكي مدمج', code: 'PROD-KT-001', qty: 1 }], containerId: uid(401), createdAt: today(-26) },
  { id: uid(903), num: 'BOX-2024003', type: BOX_TYPES[2], wgt: '200', bldg: '1', flr: '1', notes: 'قابل للكسر', prods: [{ id: uid(605), name: 'وحدة حمام رئيسية', code: 'PROD-BR-001', qty: 2 }, { id: uid(606), name: 'وحدة حمام ضيوف', code: 'PROD-BR-002', qty: 1 }], containerId: uid(402), createdAt: today(-22) },
  { id: uid(904), num: 'BOX-2024004', type: BOX_TYPES[0], wgt: '150', bldg: '1', flr: '2', notes: undefined, prods: [{ id: uid(607), name: 'وحدة تلفزيون معيشة', code: 'PROD-LV-001', qty: 2 }], containerId: uid(403), createdAt: today(-18) },
  { id: uid(905), num: 'BOX-2024005', type: BOX_TYPES[3], wgt: '75', bldg: 'ب', flr: '1', notes: undefined, prods: [{ id: uid(608), name: 'طاولة قهوة مركزية', code: 'PROD-LV-002', qty: 3 }], containerId: uid(403), createdAt: today(-16) },
  { id: uid(906), num: 'BOX-2024006', type: BOX_TYPES[1], wgt: '180', bldg: '1', flr: '1', notes: 'عناية خاصة', prods: [{ id: uid(609), name: 'سرير ماستر مع لوح رأسي', code: 'PROD-BD-001', qty: 1 }, { id: uid(610), name: 'سرير أطفال مزدوج', code: 'PROD-BD-002', qty: 1 }], containerId: uid(404), createdAt: today(-14) },
  { id: uid(907), num: 'BOX-2024007', type: BOX_TYPES[2], wgt: '95', bldg: '1', flr: 'أرضي', notes: undefined, prods: [{ id: uid(611), name: 'مكتب إداري مع خزانة', code: 'PROD-OF-001', qty: 2 }], containerId: uid(405), createdAt: today(-10) },
  { id: uid(908), num: 'BOX-2024008', type: BOX_TYPES[0], wgt: '60', bldg: '2', flr: '1', notes: undefined, prods: [{ id: uid(612), name: 'وحدة أرفف مكتبية', code: 'PROD-OF-002', qty: 3 }], containerId: uid(405), createdAt: today(-8) },
  { id: uid(909), num: 'BOX-2024009', type: BOX_TYPES[3], wgt: '220', bldg: '1', flr: '1', notes: 'ثقيلة', prods: [{ id: uid(613), name: 'طاولة طعام 8 كراسي', code: 'PROD-DN-001', qty: 1 }], containerId: uid(406), createdAt: today(-6) },
  { id: uid(910), num: 'BOX-2024010', type: BOX_TYPES[1], wgt: '110', bldg: '1', flr: '2', notes: undefined, prods: [{ id: uid(614), name: 'بوفيه خدمة جانبي', code: 'PROD-DN-002', qty: 2 }], containerId: uid(406), createdAt: today(-5) },
  { id: uid(911), num: 'BOX-2024011', type: BOX_TYPES[2], wgt: '45', bldg: '1', flr: 'الدور الأرضي', notes: undefined, prods: [{ id: uid(615), name: 'خزانة أحذية مدخل', code: 'PROD-EN-001', qty: 4 }], containerId: uid(407), createdAt: today(-3) },
  { id: uid(912), num: 'BOX-2024012', type: BOX_TYPES[0], wgt: '130', bldg: 'ب', flr: '1', notes: undefined, prods: [{ id: uid(601), name: 'وحدة خزانة ملابس كاملة', code: 'PROD-DR-001', qty: 1 }, { id: uid(604), name: 'جزيرة مطبخ مركزية', code: 'PROD-KT-002', qty: 1 }], containerId: uid(407), createdAt: today(-2) },
];

// ─── Rejected Items (8 items) ───
const REJECTED = [
  { id: uid(1001), partId: uid(5), partCode: 'HD-HNG-001', partName: 'مفصلة باب ثقيلة', qty: 5, date: today(-20), reason: 'خدوش سطحية', notes: 'تم التواصل مع المورد', userName: 'أحمد', status: 'rejected' as const, sourceType: 'warehouse' as const, shipmentNo: 'SH-2024-001', projectName: 'فلل الساحل الشمالي', createdAt: today(-20) },
  { id: uid(1002), partId: uid(9), partCode: 'KN-DRW-001', partName: 'مقبض درج استانلس', qty: 12, date: today(-18), reason: 'لون مختلف', notes: undefined, userName: 'خالد', status: 'rejected' as const, sourceType: 'batch' as const, batchId: 'b1', batchName: 'دفعة 1 — تسليم يونيو', replacementStatus: 'pending' as const, createdAt: today(-18) },
  { id: uid(1003), partId: uid(15), partCode: 'FC-BRK-001', partName: 'قدم أثاث قابل للتعديل', qty: 8, date: today(-15), reason: 'كسر أثناء النقل', notes: 'شحنة PLT-2024-002', userName: 'سعيد', status: 'resolved' as const, sourceType: 'warehouse' as const, shipmentNo: 'SH-2024-002', projectName: 'برج الأعمال المركزي', resolution: 'تم استبدالها', resolvedAt: today(-5), createdAt: today(-15) },
  { id: uid(1004), partId: uid(29), partCode: 'TL-MRR-001', partName: 'مرآة حمام مضيئة', qty: 3, date: today(-12), reason: 'قياسات غير مطابقة', notes: 'العرض أكبر بـ 5 سم', userName: 'أحمد', status: 'rejected' as const, sourceType: 'batch' as const, batchId: 'b2', batchName: 'دفعة 1 — برج الأعمال', replacementStatus: 'requested' as const, createdAt: today(-12) },
  { id: uid(1005), partId: uid(33), partCode: 'TL-FCT-001', partName: 'حنفية نحاسية', qty: 6, date: today(-10), reason: 'تآكل معدني', notes: undefined, userName: 'خالد', status: 'rejected' as const, sourceType: 'warehouse' as const, shipmentNo: 'SH-2024-003', projectName: 'كمبوند جاردينيا', createdAt: today(-10) },
  { id: uid(1006), partId: uid(20), partCode: 'CN-PLC-002', partName: 'لوح خشب HDF', qty: 15, date: today(-8), reason: 'خدوش سطحية', notes: 'تم الإرجاع', userName: 'سعيد', status: 'resolved' as const, sourceType: 'warehouse' as const, shipmentNo: 'SH-2024-004', projectName: 'منتجع هيلتون', resolution: 'تم استلام بديل', resolvedAt: today(-3), createdAt: today(-8) },
  { id: uid(1007), partId: uid(37), partCode: 'KT-BSN-001', partName: 'حوض مطبخ استانلس عميق', qty: 2, date: today(-5), reason: 'كسر أثناء النقل', notes: 'بوكس BOX-2024009', userName: 'أحمد', status: 'rejected' as const, sourceType: 'batch' as const, batchId: 'b3', batchName: 'دفعة 2 — منتجع هيلتون', replacementStatus: 'pending' as const, createdAt: today(-5) },
  { id: uid(1008), partId: uid(40), partCode: 'KT-GAS-002', partName: 'فرن كهربائي مدمج', qty: 1, date: today(-3), reason: 'قياسات غير مطابقة', notes: 'الارتفاع لا يتناسب', userName: 'خالد', status: 'rejected' as const, sourceType: 'batch' as const, batchId: 'b1', batchName: 'دفعة 1 — تسليم يونيو', replacementStatus: 'replaced' as const, createdAt: today(-3) },
];

// ─── Inspections (8 items) ───
const INSP_ITEMS = ['سلامة الأسطح', 'مطابقة الأبعاد', 'جودة اللحام', 'تجانس الطلاء', 'عملية المفصلات', 'سهولة الحركة'];
const INSPECTIONS = [
  { id: uid(1101), title: 'فحص دفعة أ — فلل الساحل الشمالي', date: today(-20), inspector: 'محمد فحص', items: INSP_ITEMS.slice(0, 4).map(name => ({ name, result: (Math.random() > 0.2 ? 'pass' : 'fail') as 'pass' | 'fail' })), status: 'pass' as const, createdAt: today(-20) },
  { id: uid(1102), title: 'فحص دفعة ب — برج الأعمال المركزي', date: today(-18), inspector: 'خالد تفتيش', items: INSP_ITEMS.slice(0, 5).map(name => ({ name, result: (Math.random() > 0.3 ? 'pass' : 'fail') as 'pass' | 'fail' })), status: 'fail' as const, createdAt: today(-18) },
  { id: uid(1103), title: 'فحص دفعة ج — كمبوند جاردينيا', date: today(-15), inspector: 'سعيد مراقبة', items: INSP_ITEMS.slice(0, 3).map(name => ({ name, result: 'pass' as const })), status: 'pass' as const, createdAt: today(-15) },
  { id: uid(1104), title: 'فحص دفعة د — منتجع هيلتون', date: today(-12), inspector: 'محمد فحص', items: INSP_ITEMS.slice(0, 6).map(name => ({ name, result: (Math.random() > 0.15 ? 'pass' : 'fail') as 'pass' | 'fail' })), status: 'pass' as const, createdAt: today(-12) },
  { id: uid(1105), title: 'فحص دفعة هـ — مجمع مدارس النخبة', date: today(-10), inspector: 'خالد تفتيش', items: INSP_ITEMS.slice(0, 4).map(name => ({ name, result: (Math.random() > 0.25 ? 'pass' : 'fail') as 'pass' | 'fail' })), status: 'fail' as const, createdAt: today(-10) },
  { id: uid(1106), title: 'فحص دفعة و — مستشفى الأمل', date: today(-8), inspector: 'سعيد مراقبة', items: INSP_ITEMS.slice(0, 5).map(name => ({ name, result: 'pass' as const })), status: 'pass' as const, createdAt: today(-8) },
  { id: uid(1107), title: 'فحص دفعة ز — مول الشرق التجاري', date: today(-5), inspector: 'محمد فحص', items: INSP_ITEMS.slice(0, 3).map(name => ({ name, result: (Math.random() > 0.3 ? 'pass' : 'fail') as 'pass' | 'fail' })), status: 'pass' as const, createdAt: today(-5) },
  { id: uid(1108), title: 'فحص دفعة ح — فلل الساحل الشمالي', date: today(-3), inspector: 'خالد تفتيش', items: INSP_ITEMS.slice(0, 6).map(name => ({ name, result: 'pass' as const })), status: 'pass' as const, createdAt: today(-3) },
];

// ─── Users (10 items) ───
// NOTE: No fake USERS are seeded — users must register via Firebase Auth.
// Only the first admin is auto-created via syncUserFromFirestore().

// ─── Settings ───
const SETTINGS = {
  companyName: 'شركة مأمون للإنتاج والتطوير',
  defaultLang: 'ar',
  timezone: 'UTC+3',
  dateFormat: 'YYYY-MM-DD',
  currency: 'SAR',
  forcePasswordChange: true,
  approvalRequired: true,
  minPasswordLength: 6,
  sessionTimeout: 60,
  maxBoxesPerContainer: 100,
  maxPalletsPerContainer: 10,
  autoCreateContainer: true,
};

// ─── Persistent seed marker — survives page reloads ───
const SEED_MARKER_ID = 'seeded';

// ─── Main Seed Function ───
// CLOUD ONLY — writes directly to Firestore, NO localStorage
// Uses a persistent Firestore marker so seeding only happens ONCE ever.
export async function seedData() {
  console.log('[seedData] Checking if already seeded...');

  try {
    const { getDoc, getDocs, collection, setDoc, doc } = await import('firebase/firestore');
    const { db } = await import('@/firebase/config');

    // 1. Check persistent seed marker (survives page reloads)
    const markerSnap = await getDoc(doc(db, 'app', SEED_MARKER_ID));
    if (markerSnap.exists()) {
      console.log('[seedData] Already seeded (marker exists). Skipping.');
      return;
    }

    // 2. Also check if any products exist (for backward compat with existing DBs)
    const prodsSnap = await getDocs(collection(db, 'products'));
    if (!prodsSnap.empty) {
      console.log('[seedData] Products exist but no marker — creating marker and skipping.');
      await setDoc(doc(db, 'app', SEED_MARKER_ID), {
        seededAt: new Date().toISOString(),
        auto: true, // marker added automatically (backward compat)
      });
      return;
    }

    console.log('[seedData] Firestore empty — seeding to Cloud...');

    const writeAll = async (col: string, items: any[]) => {
      const { writeBatch } = await import('firebase/firestore');
      // Firestore batch limit is 500 operations
      const BATCH_SIZE = 400;
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const chunk = items.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        for (const item of chunk) {
          batch.set(doc(db, col, item.id), item, { merge: true });
        }
        await batch.commit();
      }
      console.log(`[seedData] ✅ ${col}: ${items.length} items written to Cloud`);
    };

    await writeAll('parts', PARTS);
    await writeAll('tops', TOPS);
    await writeAll('accessories', ACCESSORIES);
    await writeAll('products', PRODUCTS);
    await writeAll('projects', PROJECTS);
    await writeAll('batches', BATCHES);
    await writeAll('containers', CONTAINERS);
    await writeAll('pallets', PALLETS);
    await writeAll('boxes', BOXES);
    await writeAll('movements', MOVEMENTS);
    await writeAll('rejected', REJECTED);
    await writeAll('inspections', INSPECTIONS);
    await setDoc(doc(db, 'app', 'settings'), SETTINGS, { merge: true });
    // Write persistent seed marker — prevents re-seeding forever
    await setDoc(doc(db, 'app', SEED_MARKER_ID), {
      seededAt: new Date().toISOString(),
      version: '1.0',
    });

    console.log('[seedData] ☁️ Cloud seed complete — ALL data on Firestore. Marker set.');

    // Sync Zustand store
    try {
      useDataStore.setState({
        parts: PARTS, tops: TOPS, accessories: ACCESSORIES,
        products: PRODUCTS, projects: PROJECTS, batches: BATCHES,
        containers: CONTAINERS, pallets: PALLETS, boxes: BOXES,
        movements: MOVEMENTS, rejected: REJECTED, inspections: INSPECTIONS,
        settings: SETTINGS, isLoading: false,
      });
    } catch (e) {
      console.warn('[seedData] Store sync failed:', e);
    }
  } catch (e) {
    console.error('[seedData] ❌ Firestore seed failed:', e);
    // STRICTLY NO localStorage fallback
  }
}

// ─── Factory Reset ───
// Clears Firestore data (admin use only)
export async function factoryReset() {
  console.warn('[factoryReset] Clearing Firestore...');
  try {
    const { getDocs, collection, deleteDoc, doc } = await import('firebase/firestore');
    const { db } = await import('@/firebase/config');
    const cols = ['parts', 'tops', 'accessories', 'products', 'projects', 'batches', 'containers', 'pallets', 'boxes', 'movements', 'rejected', 'inspections', 'users'];
    for (const col of cols) {
      const snap = await getDocs(collection(db, col));
      for (const d of snap.docs) await deleteDoc(doc(db, col, d.id));
    }
    // Also clear the seed marker so seed can run again
    try { await deleteDoc(doc(db, 'app', SEED_MARKER_ID)); } catch {}
    console.log('[factoryReset] ✅ Firestore cleared. Refresh to re-seed.');
  } catch (e) {
    console.error('[factoryReset] ❌ Failed:', e);
  }
}
