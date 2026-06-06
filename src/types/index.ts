// ============================================================
// أنواع البيانات — نظام إدارة الإنتاج والشحن v8.0
// ============================================================

export type PermissionLevel = 'none' | 'view' | 'edit';

export interface RolePermission {
  page: string;        // page ID (e.g., 'packing-list-report')
  level: PermissionLevel; // 'none' | 'view' | 'edit'
}

export interface RoleDefinition {
  id: string;          // role ID (e.g., 'packing_viewer')
  name: string;        // display name (e.g., 'عارض باكنج ليست')
  permissions: RolePermission[];
  isCustom?: boolean;  // true if user-created role
}

// Built-in system roles
export type SystemRole = 'admin' | 'analysis' | 'warehouse' | 'quality' | 'delivery_receiver' | 'installer';

// Any role can be a system role or a custom role ID
export type UserRole = SystemRole | string;
export type UserStatus = 'active' | 'pending' | 'suspended' | 'rejected' | 'archived';
export type PartSource = 'local' | 'import';
export type BatchStatus = 'جديد' | 'قيد التجهيز' | 'تم';
export type NoteStatus = 'open' | 'in_progress' | 'done' | 'rejected';

export interface BatchNoteReply {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: string;
  images?: string[];
}

export interface BatchNote {
  id: string;
  batchId: string;
  text: string;
  status: NoteStatus;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: string;
  updatedAt: string;
  images?: string[];
  replies: BatchNoteReply[];
  mentions?: string[]; // user IDs to notify
}
export type MovementType = 'in' | 'out' | 'adj' | 'return' | 'rejected';
export type ContainerSource = 'local' | 'import';

// ─── Workflow Pipeline Stages ───
// Every batch/project goes through these stages. Each stage has an owner and a confirmation button.
export type WorkflowStage =
  | 'batch_ready'      // دفعة جاهزة — مسؤول الإنتاج
  | 'batch_sent'       // أُرسلت للتحجيم — إشعار لمسؤول التحجيم
  | 'packing'          // تحت التحجيم — مسؤول التحجيم
  | 'packing_done'     // تم التحجيم — إشعار للشحنات
  | 'shipment_ready'   // جاهزة للشحن — مسؤول الشحنات
  | 'shipped'          // تم الإرسال — إشعار للاستلام
  | 'delivered'        // تم الاستلام — إشعار للتركيب
  | 'installed';       // تم التركيب — مكتملة

export interface WorkflowStep {
  stage: WorkflowStage;
  label: string;
  shortLabel: string;
  description: string;
  ownerRole: string;     // who is responsible
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  nextStage: WorkflowStage | null;
}

export interface BatchWorkflow {
  batchId: string;
  batchName: string;
  projectName: string;
  currentStage: WorkflowStage;
  stages: {
    stage: WorkflowStage;
    completed: boolean;
    completedBy?: string;
    completedAt?: string;
    notes?: string;
  }[];
  updatedAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  photoURL?: string;
  phone?: string;
  department?: string;
  createdAt: string;
  lastLogin?: string;
  approvedAt?: string;
  forcePasswordChange?: boolean;
  // Archive fields
  archivedAt?: string;
  previousRole?: string;
  restoredAt?: string;
}

export interface Part {
  id: string;
  revit: string;
  name: string;
  type: 'part' | 'part-set';
  supplierCode?: string;
  unit: string;
  qty: number;           // Total stock (رصيد كلي)
  reservedQty?: number;  // Reserved for packing (محجوز) — NOT physically deducted yet
  min: number;
  source: PartSource;
  img?: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: number; // kg per unit
  components?: PartComponent[];
  barcode?: string;
  shortId?: string;       // ← short link ID for public QR
  publicQR?: boolean;     // ← enabled for public QR
  // ─── Nesting (تداخل) — e.g., tables can be nested inside each other ───
  allowNesting?: boolean;        // هل يسمح بالتداخل؟
  maxNestingCount?: number;      // أقصى عدد قطع يمكن تداخلها
  nestingSizeIncrease?: number;  // الزيادة في القياس لكل تداخل (سم)
  createdAt: string;
  updatedAt: string;
}

export interface PartComponent {
  id: string;
  code: string;
  name: string;
  qty: number;
  type: string;
  itemType: 'part' | 'accessory';
}

export interface Top {
  id: string;
  code: string;
  name: string;
  length: number;
  width: number;
  weight?: number; // kg per unit
  thickness: number;
  supplierCode?: string;
  localCode?: string;
  product: PartSource;
  img?: string;
  barcode?: string;
  shortId?: string;       // ← short link ID for public QR
  publicQR?: boolean;     // ← enabled for public QR
  createdAt: string;
  updatedAt: string;
}

export interface Accessory {
  id: string;
  code: string;
  name: string;
  type: 'accessory' | 'acc-set';
  unit: string;
  weight?: number; // kg per unit
  components?: PartComponent[];
  barcode?: string;
  img?: string;
  shortId?: string;       // ← short link ID for public QR
  publicQR?: boolean;     // ← enabled for public QR
  createdAt: string;
  updatedAt: string;
}

export interface ProductComponent {
  id: string;
  code: string;
  name: string;
  qty: number;
  compType: 'part' | 'part-set' | 'accessory' | 'acc-set' | 'top';
}

export interface Product {
  id: string;
  code: string;
  name: string;
  desc?: string;
  dim: { l: string; w: string; h: string };
  weight?: string;
  img?: string;
  components: ProductComponent[];
  barcode?: string;
  shortId?: string;       // ← short link ID for public QR
  publicQR?: boolean;     // ← enabled for public QR
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRoom {
  id: string;
  name: string;       // e.g. "G-101", "1-201"
}

export interface ProjectFloor {
  id?: string;             // optional — old data may not have it
  name: string;
  source: PartSource;
  rooms?: ProjectRoom[];  // optional for backwards compat
}

export interface ProjectBuilding {
  id: string;
  name: string;
  floors: ProjectFloor[];
}

export interface Project {
  id: string;
  name: string;
  code?: string;
  client?: string;
  buildings: ProjectBuilding[];
  createdAt: string;
  updatedAt: string;
}

export interface BatchProduct {
  id: string;
  name: string;
  code: string;
  qty: number;
  roomId?: string;      // ← assigned room for installation
  roomName?: string;    // ← display name (e.g. "G-101")
  buildingId?: string;  // ← for reference
  floorId?: string;     // ← for reference
}

export interface BatchExtraItem {
  id: string;
  itemId: string;       // ref to part/accessory/top
  name: string;
  code: string;
  type: 'part' | 'accessory' | 'top';
  qty: number;
}

export interface Batch {
  id: string;
  projectId: string;
  projectName?: string;
  name: string;           // e.g. "دفعة 1 — تسليم يونيو"
  source: PartSource;     // 'local' | 'import' — EVERYTHING in this batch
  status: BatchStatus;
  deliveryDate?: string;
  invoiceNo?: string;     // رقم الفاتورة للتعبئة
  desc?: string;          // وصف البضاعة
  prods: BatchProduct[];           // products + quantities
  extraParts: BatchExtraItem[];    // loose parts
  extraAccessories: BatchExtraItem[]; // loose accessories
  extraTops: BatchExtraItem[];     // loose tops
  // ─── Workflow Stage Tracking ───
  workflowStage?: WorkflowStage;
  stageHistory?: {
    stage: WorkflowStage;
    startedAt: string;
    completedAt?: string;
    completedBy?: string;
    notes?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// ─── Batch Pick List (كشف القطع) — auto-generated from product components ───
export interface PickListItem {
  id: string;
  code: string;
  name: string;
  type: 'part' | 'accessory' | 'top';
  qty: number;
  source: PartSource;
  unit?: string;
  fromProduct?: string;   // which product this came from
  isExtra?: boolean;      // true if manually added (not from product)
  weight?: number;        // kg per unit (for total weight calc)
  length?: number;        // cm (for 3D validation)
  width?: number;         // cm
  height?: number;        // cm
  assignedQty?: number;   // qty assigned to a box (used in packing)
}

export interface BatchPickList {
  batchId: string;
  batchName: string;
  source: PartSource;
  localItems: PickListItem[];
  importItems: PickListItem[];
  generatedAt: string;
}

export interface Container {
  id: string;
  number: string;           // رقم الكونتينر
  desc?: string;
  source: ContainerSource;  // 'local' | 'import'
  project?: string;
  destination?: string;
  date?: string;
  notes?: string;
  // ─── Driver info ───
  driverName?: string;      // اسم السائق
  driverPhone?: string;     // رقم هاتف السائق
  plateNumber?: string;     // رقم اللوحة
  // ─── Dimensions & Weight ───
  contLength?: number;      // طول الكونتينر (cm)
  contWidth?: number;       // عرض الكونتينر (cm)
  contHeight?: number;      // ارتفاع الكونتينر (cm)
  emptyWeight?: number;     // وزن الكونتينر الفارغ (kg)
  maxWeight?: number;       // الحد الأقصى للوزن (kg)
  // ─── Assigned boxes & pallets ───
  boxes: string[];          // IDs of assigned boxes
  pallets?: string[];       // IDs of assigned pallets
  shipped?: boolean;        // true when shipment is sent (locked)
  // ─── Shipment status ───
  shipmentStatus?: 'pending' | 'shipped' | 'delivered';
  shippedAt?: string;
  shippedBy?: string;
  deliveredAt?: string;
  deliveredBy?: string;
  // ─── Archive ───
  archived?: boolean;        // true when container is archived (hidden from main view)
  archivedAt?: string;       // ISO timestamp when archived
  archivedBy?: string;       // user who archived
  // ─── Workflow Stage Tracking ───
  workflowStage?: WorkflowStage;
  stageHistory?: {
    stage: WorkflowStage;
    startedAt: string;
    completedAt?: string;
    completedBy?: string;
    notes?: string;
  }[];
  readyToShip?: boolean;
  readyToShipAt?: string;
  readyToShipBy?: string;
  createdAt: string;
}

// ═══ Templates (قوالب قياسية) ═══

export interface BoxTemplate {
  id: string;
  name: string;            // اسم القالب: "كرتون قياسي", "صندوق خشبي كبير"
  type: string;            // Carton | Wooden | Plastic | Metal
  boxLength?: number;      // طول (cm)
  boxWidth?: number;       // عرض (cm)
  boxHeight?: number;      // ارتفاع (cm)
  wgt?: string;            // وزن فارغ (kg)
  maxWeight?: number;      // حد أقصى للوزن (kg)
  stackable?: boolean;     // هل يكدس؟
  isDefault?: boolean;     // قالب افتراضي
  createdAt: string;
}

export interface ContainerTemplate {
  id: string;
  name: string;            // اسم القالب: "كونتينر 20 قدم", "صندوق شحن كبير"
  contLength?: number;     // طول (cm)
  contWidth?: number;      // عرض (cm)
  contHeight?: number;     // ارتفاع (cm)
  emptyWeight?: number;    // وزن فارغ (kg)
  maxWeight?: number;      // حد أقصى للوزن (kg)
  isDefault?: boolean;
  createdAt: string;
}

export interface PalletTemplate {
  id: string;
  name: string;            // اسم القالب: "طبلية خشبية قياسية"
  dimensions?: string;     // "120x100x15"
  wgt?: string;            // وزن (kg)
  maxWeight?: number;      // حد أقصى للوزن (kg)
  isDefault?: boolean;
  createdAt: string;
}

export interface Pallet {
  id: string;
  number: string;
  desc?: string;
  source: ContainerSource;
  dimensions?: string;
  wgt?: string;
  location?: string;
  notes?: string;
  boxes: string[];
  createdAt: string;
}

export interface Box {
  id: string;
  num: string;
  shipId?: string;
  bldg?: string;
  flr?: string;
  type: string;
  wgt?: string;                  // box empty weight (kg)
  notes?: string;
  prods: { id: string; name: string; code: string; qty: number }[];
  containerId?: string | null;
  palletId?: string | null;
  batchId?: string | null;       // links to batch
  source?: PartSource;            // 'local' | 'import' (matches batch)
  pickItems?: PickListItem[];     // items assigned to this box (drag & drop)
  images?: string[];               // توثيق صور داخل الصندوق (اكسسوارات)
  // ─── 3D packing validation ───
  boxLength?: number;             // صندوق طول (cm)
  boxWidth?: number;              // صندوق عرض (cm)
  boxHeight?: number;             // صندوق ارتفاع (cm)
  maxWeight?: number;             // الحد الأقصى للوزن (kg)
  // ─── Stacking (تكديس) — can other boxes be placed on top? ───
  stackable?: boolean;            // هل يسمح بوضع صندوق فوقه؟
  // ─── Nesting info (filled from product) ───
  nestedCount?: number;           // عدد القطع المتداخلة داخله
  shipped?: boolean;              // true when container is shipped (locked)
  // ─── Installation ───
  installed?: boolean;            // true when item is installed on-site
  installedAt?: string;           // ISO timestamp
  installedBy?: string;           // installer name
  createdAt: string;
}

export interface Movement {
  id: string;
  partId: string;
  partName: string;
  partType: string;
  type: MovementType;
  qty: number;
  containerId?: string | null;
  palletId?: string | null;
  reason?: string;
  source: string;
  afterQty?: number;
  date: string;
  createdAt: string;
}

export type RejectedSourceType = 'warehouse' | 'batch';
export type ReplacementStatus = 'none' | 'pending' | 'requested' | 'replaced';

export interface RejectedItem {
  id: string;
  partId: string;
  partCode: string;
  partName: string;
  qty: number;
  date: string;
  reason: string;
  img?: string | null;
  notes?: string;
  userName: string;
  status: 'rejected' | 'resolved';
  resolution?: string;
  resolvedAt?: string;
  // Source tracking
  sourceType: RejectedSourceType;      // 'warehouse' or 'batch'
  shipmentNo?: string;                 // for warehouse source
  projectName?: string;                // for warehouse source
  batchId?: string;                    // for batch source
  batchName?: string;                  // for batch source
  replacementStatus?: ReplacementStatus; // 'none' | 'pending' | 'requested' | 'replaced'
  createdAt: string;
}

export interface InspectionItem {
  name: string;
  result: 'pass' | 'fail';
}

export interface Inspection {
  id: string;
  title: string;
  date: string;
  inspector?: string;
  items: InspectionItem[];
  status: 'pass' | 'fail' | 'pending';
  notes?: string;
  createdAt: string;
}

export interface PackingItem {
  id: string;
  name: string;
  type: string;
  qty: number;
  addedAt: string;
}

export interface BarcodeSegment {
  id: string;
  type: 'type' | 'year' | 'seq' | 'dim' | 'partcode' | 'prodcode' | 'custom';
  value: string;
  length?: number;
}

export interface AppSettings {
  companyName: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  defaultLang: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  forcePasswordChange: boolean;
  approvalRequired: boolean;
  minPasswordLength: number;
  sessionTimeout: number;
  maxBoxesPerContainer: number;
  maxPalletsPerContainer: number;
  autoCreateContainer: boolean;
  barcodePattern?: string;
  barcodeSegments?: BarcodeSegment[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  perm: string;
  badge?: 'pending' | null;
}

export interface NavCategory {
  category: string;
  items: NavItem[];
}

// ═══ Installation Tracking (v9.0) ═══

export type InstallItemStatus = 'pending' | 'installed' | 'missing' | 'rejected' | 'noted';

export interface ProductInstallComponent {
  partId: string;           // ref to part/accessory/top
  partCode: string;
  partName: string;
  partType: 'part' | 'accessory' | 'top';
  qty: number;              // required quantity
  status: InstallItemStatus;
  noteId?: string;          // link to batch note if any
  noteText?: string;        // quick note text
}

export interface ProductInstallation {
  id: string;
  batchId: string;
  batchName: string;
  productId: string;
  productName: string;
  productCode: string;
  productImg?: string;
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorName: string;
  roomId: string;
  roomName: string;
  qty: number;              // how many of this product
  components: ProductInstallComponent[];
  overallProgress: number;  // 0-100 calculated from components
  installedAt?: string;
  installedBy?: string;
  boxId?: string;           // ref to box for final confirmation
  boxNum?: string;          // box number for display
  createdAt: string;
  updatedAt: string;
}
