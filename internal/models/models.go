package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Email        string     `gorm:"uniqueIndex;size:255;not null" json:"email"`
	PasswordHash string     `gorm:"size:255;not null" json:"-"`
	FirstName    string     `gorm:"size:100;not null" json:"first_name"`
	LastName     string     `gorm:"size:100;not null" json:"last_name"`
	Phone        string     `gorm:"size:20" json:"phone"`
	Avatar       string     `gorm:"type:text" json:"avatar"`
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Roles        []UserRole `gorm:"foreignKey:UserID" json:"roles,omitempty"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

type Session struct {
	ID               uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID           uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	TokenHash        string    `gorm:"size:255;not null" json:"-"`
	RefreshTokenHash string    `gorm:"size:255;not null" json:"-"`
	DeviceInfo       string    `gorm:"size:255" json:"device_info"`
	IPAddress        string    `gorm:"size:45" json:"ip_address"`
	ExpiresAt        time.Time `gorm:"not null" json:"expires_at"`
	CreatedAt        time.Time `json:"created_at"`
	User             User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

type LoginHistory struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	IPAddress  string    `gorm:"size:45" json:"ip_address"`
	DeviceInfo string    `gorm:"size:255" json:"device_info"`
	Location   string    `gorm:"size:255" json:"location"`
	Success    bool      `gorm:"default:true" json:"success"`
	CreatedAt  time.Time `json:"created_at"`
	User       User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (l *LoginHistory) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}

type Role struct {
	ID          uuid.UUID        `gorm:"type:uuid;primary_key" json:"id"`
	Name        string           `gorm:"uniqueIndex;size:50;not null" json:"name"`
	Description string           `gorm:"size:255" json:"description"`
	CreatedAt   time.Time        `json:"created_at"`
	Permissions []RolePermission `gorm:"foreignKey:RoleID" json:"permissions,omitempty"`
}

func (r *Role) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

type UserRole struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	RoleID     uuid.UUID  `gorm:"type:uuid;not null" json:"role_id"`
	AssignedAt time.Time  `json:"assigned_at"`
	AssignedBy *uuid.UUID `gorm:"type:uuid" json:"assigned_by"`
	User       User       `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Role       Role       `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

func (ur *UserRole) BeforeCreate(tx *gorm.DB) error {
	if ur.ID == uuid.Nil {
		ur.ID = uuid.New()
	}
	if ur.AssignedAt.IsZero() {
		ur.AssignedAt = time.Now()
	}
	return nil
}

type Permission struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Name        string    `gorm:"uniqueIndex;size:100;not null" json:"name"`
	Description string    `gorm:"size:255" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

func (p *Permission) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type RolePermission struct {
	ID           uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	RoleID       uuid.UUID  `gorm:"type:uuid;not null" json:"role_id"`
	PermissionID uuid.UUID  `gorm:"type:uuid;not null" json:"permission_id"`
	CreatedAt    time.Time  `json:"created_at"`
	Role         Role       `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	Permission   Permission `gorm:"foreignKey:PermissionID" json:"permission,omitempty"`
}

func (rp *RolePermission) BeforeCreate(tx *gorm.DB) error {
	if rp.ID == uuid.Nil {
		rp.ID = uuid.New()
	}
	return nil
}

type Category struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Name        string     `gorm:"size:100;not null" json:"name"`
	Description string     `gorm:"type:text" json:"description"`
	ParentID    *uuid.UUID `gorm:"type:uuid" json:"parent_id"`
	Image       string     `gorm:"size:500" json:"image"`
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	CreatedBy   *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	UpdatedBy   *uuid.UUID `gorm:"type:uuid" json:"updated_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Parent      *Category  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Products    []Product  `gorm:"foreignKey:CategoryID" json:"products,omitempty"`
	Creator     *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater     *User      `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
}

func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

type Supplier struct {
	ID            uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Name          string     `gorm:"size:255;not null" json:"name"`
	Code          string     `gorm:"uniqueIndex;size:50;not null" json:"code"`
	Email         string     `gorm:"size:255" json:"email"`
	Phone         string     `gorm:"size:20" json:"phone"`
	Address       string     `gorm:"type:text" json:"address"`
	City          string     `gorm:"size:100" json:"city"`
	Country       string     `gorm:"size:100" json:"country"`
	ContactPerson string     `gorm:"size:255" json:"contact_person"`
	Notes         string     `gorm:"type:text" json:"notes"`
	CreatedBy     *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	UpdatedBy     *uuid.UUID `gorm:"type:uuid" json:"updated_by"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	Creator       *User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater       *User      `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
}

func (s *Supplier) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

type Warehouse struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Name      string     `gorm:"size:255;not null" json:"name"`
	Code      string     `gorm:"uniqueIndex;size:50;not null" json:"code"`
	Address   string     `gorm:"type:text" json:"address"`
	City      string     `gorm:"size:100" json:"city"`
	Country   string     `gorm:"size:100" json:"country"`
	IsPrimary bool       `gorm:"default:false" json:"is_primary"`
	IsActive  bool       `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	Locations []Location `gorm:"foreignKey:WarehouseID" json:"locations,omitempty"`
}

func (w *Warehouse) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

type Location struct {
	ID          uuid.UUID   `gorm:"type:uuid;primary_key" json:"id"`
	WarehouseID uuid.UUID   `gorm:"type:uuid;not null" json:"warehouse_id"`
	Zone        string      `gorm:"size:10;not null" json:"zone"`
	Aisle       string      `gorm:"size:10;not null" json:"aisle"`
	Rack        string      `gorm:"size:10;not null" json:"rack"`
	Shelf       string      `gorm:"size:10;not null" json:"shelf"`
	Bin         string      `gorm:"size:10;not null" json:"bin"`
	Code        string      `gorm:"uniqueIndex;size:50;not null" json:"code"`
	MaxCapacity int         `gorm:"default:100" json:"max_capacity"`
	IsActive    bool        `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
	Warehouse   Warehouse   `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Inventories []Inventory `gorm:"foreignKey:LocationID" json:"inventories,omitempty"`
}

func (l *Location) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}

func (l *Location) GenerateCode() string {
	return fmt.Sprintf("%s-%s-%s-%s-%s", l.Zone, l.Aisle, l.Rack, l.Shelf, l.Bin)
}

type Product struct {
	ID               uuid.UUID         `gorm:"type:uuid;primary_key" json:"id"`
	SKU              string            `gorm:"uniqueIndex;size:100;not null" json:"sku"`
	Name             string            `gorm:"size:255;not null" json:"name"`
	Description      string            `gorm:"type:text" json:"description"`
	CategoryID       *uuid.UUID        `gorm:"type:uuid" json:"category_id"`
	Unit             string            `gorm:"size:50;default:PCS" json:"unit"`
	Barcode          string            `gorm:"size:100" json:"barcode"`
	Image            string            `gorm:"size:500" json:"image"`
	CostPrice        float64           `gorm:"default:0" json:"cost_price"`
	SellPrice        float64           `gorm:"default:0" json:"sell_price"`
	Currency         string            `gorm:"size:3;default:USD" json:"currency"`
	MinStockLevel    int               `gorm:"default:0" json:"min_stock_level"`
	MaxStockLevel    int               `gorm:"default:0" json:"max_stock_level"`
	ReorderPoint     int               `gorm:"default:0" json:"reorder_point"`
	IsActive         bool              `gorm:"default:true" json:"is_active"`
	CreatedBy        *uuid.UUID        `gorm:"type:uuid" json:"created_by"`
	UpdatedBy        *uuid.UUID        `gorm:"type:uuid" json:"updated_by"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
	Category         *Category         `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	ProductSuppliers []ProductSupplier `gorm:"foreignKey:ProductID" json:"product_suppliers,omitempty"`
	Inventories      []Inventory       `gorm:"foreignKey:ProductID" json:"inventories,omitempty"`
	Creator          *User             `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Updater          *User             `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
}

func (p *Product) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type ProductSupplier struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	ProductID    uuid.UUID `gorm:"type:uuid;not null" json:"product_id"`
	SupplierID   uuid.UUID `gorm:"type:uuid;not null" json:"supplier_id"`
	SupplierSKU  string    `gorm:"size:100" json:"supplier_sku"`
	CostPrice    float64   `json:"cost_price"`
	LeadTimeDays int       `json:"lead_time_days"`
	CreatedAt    time.Time `json:"created_at"`
	Product      Product   `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Supplier     Supplier  `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
}

func (ps *ProductSupplier) BeforeCreate(tx *gorm.DB) error {
	if ps.ID == uuid.Nil {
		ps.ID = uuid.New()
	}
	return nil
}

type Inventory struct {
	ID               uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	ProductID        uuid.UUID  `gorm:"type:uuid;not null" json:"product_id"`
	WarehouseID      uuid.UUID  `gorm:"type:uuid;not null" json:"warehouse_id"`
	LocationID       *uuid.UUID `gorm:"type:uuid" json:"location_id"`
	Quantity         int        `gorm:"default:0" json:"quantity"`
	ReservedQuantity int        `gorm:"default:0" json:"reserved_quantity"`
	LastStockIn      *time.Time `json:"last_stock_in"`
	LastStockOut     *time.Time `json:"last_stock_out"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	Product          Product    `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Warehouse        Warehouse  `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Location         *Location  `gorm:"foreignKey:LocationID" json:"location,omitempty"`
}

func (i *Inventory) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

type TransactionType string
type TransactionStatus string

const (
	TransactionIn         TransactionType = "IN"
	TransactionOut        TransactionType = "OUT"
	TransactionTransfer   TransactionType = "TRANSFER"
	TransactionAdjustment TransactionType = "ADJUSTMENT"

	TransactionPending   TransactionStatus = "PENDING"
	TransactionApproved  TransactionStatus = "APPROVED"
	TransactionRejected  TransactionStatus = "REJECTED"
	TransactionCancelled TransactionStatus = "CANCELLED"
)

type StockTransaction struct {
	ID              uuid.UUID         `gorm:"type:uuid;primary_key" json:"id"`
	TransactionNo   string            `gorm:"uniqueIndex;size:50;not null" json:"transaction_no"`
	TransactionType TransactionType   `gorm:"not null" json:"transaction_type"`
	ProductID       uuid.UUID         `gorm:"type:uuid;not null" json:"product_id"`
	FromWarehouseID *uuid.UUID        `gorm:"type:uuid" json:"from_warehouse_id"`
	ToWarehouseID   *uuid.UUID        `gorm:"type:uuid" json:"to_warehouse_id"`
	FromLocationID  *uuid.UUID        `gorm:"type:uuid" json:"from_location_id"`
	ToLocationID    *uuid.UUID        `gorm:"type:uuid" json:"to_location_id"`
	Quantity        int               `gorm:"not null" json:"quantity"`
	UnitCost        float64           `json:"unit_cost"`
	TotalCost       float64           `json:"total_cost"`
	ReferenceNo     string            `gorm:"size:100" json:"reference_no"`
	Reason          string            `gorm:"type:text" json:"reason"`
	Notes           string            `gorm:"type:text" json:"notes"`
	CreatedBy       *uuid.UUID        `gorm:"type:uuid" json:"created_by"`
	ApprovedBy      *uuid.UUID        `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt      *time.Time        `json:"approved_at"`
	Status          TransactionStatus `gorm:"default:PENDING" json:"status"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	Product         Product           `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	FromWarehouse   *Warehouse        `gorm:"foreignKey:FromWarehouseID" json:"from_warehouse,omitempty"`
	ToWarehouse     *Warehouse        `gorm:"foreignKey:ToWarehouseID" json:"to_warehouse,omitempty"`
	FromLocation    *Location         `gorm:"foreignKey:FromLocationID" json:"from_location,omitempty"`
	ToLocation      *Location         `gorm:"foreignKey:ToLocationID" json:"to_location,omitempty"`
	Creator         *User             `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

func (st *StockTransaction) BeforeCreate(tx *gorm.DB) error {
	if st.ID == uuid.Nil {
		st.ID = uuid.New()
	}
	return nil
}

type PurchaseOrderStatus string
type PurchaseOrderPriority string

const (
	POStatusDraft             PurchaseOrderStatus = "DRAFT"
	POStatusPending           PurchaseOrderStatus = "PENDING"
	POStatusApproved          PurchaseOrderStatus = "APPROVED"
	POStatusPartiallyReceived PurchaseOrderStatus = "PARTIALLY_RECEIVED"
	POStatusReceived          PurchaseOrderStatus = "RECEIVED"
	POStatusCancelled         PurchaseOrderStatus = "CANCELLED"

	POPriorityLow    PurchaseOrderPriority = "LOW"
	POPriorityNormal PurchaseOrderPriority = "NORMAL"
	POPriorityHigh   PurchaseOrderPriority = "HIGH"
	POPriorityUrgent PurchaseOrderPriority = "URGENT"
)

type PurchaseOrder struct {
	ID             uuid.UUID             `gorm:"type:uuid;primary_key" json:"id"`
	OrderNo        string                `gorm:"uniqueIndex;size:50;not null" json:"order_no"`
	SupplierID     *uuid.UUID            `gorm:"type:uuid" json:"supplier_id"`
	WarehouseID    *uuid.UUID            `gorm:"type:uuid" json:"warehouse_id"`
	ExpectedDate   *time.Time            `json:"expected_date"`
	TotalAmount    float64               `gorm:"default:0" json:"total_amount"`
	TaxAmount      float64               `gorm:"default:0" json:"tax_amount"`
	DiscountAmount float64               `gorm:"default:0" json:"discount_amount"`
	Status         PurchaseOrderStatus   `gorm:"default:DRAFT" json:"status"`
	Priority       PurchaseOrderPriority `gorm:"default:NORMAL" json:"priority"`
	Notes          string                `gorm:"type:text" json:"notes"`
	CreatedBy      *uuid.UUID            `gorm:"type:uuid" json:"created_by"`
	ApprovedBy     *uuid.UUID            `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt     *time.Time            `json:"approved_at"`
	ReceivedAt     *time.Time            `json:"received_at"`
	CreatedAt      time.Time             `json:"created_at"`
	UpdatedAt      time.Time             `json:"updated_at"`
	Supplier       *Supplier             `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Warehouse      *Warehouse            `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Creator        *User                 `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Items          []PurchaseOrderItem   `gorm:"foreignKey:PurchaseOrderID" json:"items,omitempty"`
}

func (po *PurchaseOrder) BeforeCreate(tx *gorm.DB) error {
	if po.ID == uuid.Nil {
		po.ID = uuid.New()
	}
	return nil
}

type PurchaseOrderItem struct {
	ID               uuid.UUID     `gorm:"type:uuid;primary_key" json:"id"`
	PurchaseOrderID  uuid.UUID     `gorm:"type:uuid;not null" json:"purchase_order_id"`
	ProductID        uuid.UUID     `gorm:"type:uuid;not null" json:"product_id"`
	Quantity         int           `gorm:"not null" json:"quantity"`
	UnitPrice        float64       `gorm:"not null" json:"unit_price"`
	TotalPrice       float64       `gorm:"not null" json:"total_price"`
	ReceivedQuantity int           `gorm:"default:0" json:"received_quantity"`
	CreatedAt        time.Time     `json:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at"`
	PurchaseOrder    PurchaseOrder `gorm:"foreignKey:PurchaseOrderID" json:"purchase_order,omitempty"`
	Product          Product       `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (poi *PurchaseOrderItem) BeforeCreate(tx *gorm.DB) error {
	if poi.ID == uuid.Nil {
		poi.ID = uuid.New()
	}
	return nil
}

type SalesOrderStatus string
type SalesOrderPriority string

const (
	SOStatusDraft      SalesOrderStatus = "DRAFT"
	SOStatusPending    SalesOrderStatus = "PENDING"
	SOStatusConfirmed  SalesOrderStatus = "CONFIRMED"
	SOStatusProcessing SalesOrderStatus = "PROCESSING"
	SOStatusShipped    SalesOrderStatus = "SHIPPED"
	SOStatusDelivered  SalesOrderStatus = "DELIVERED"
	SOStatusCancelled  SalesOrderStatus = "CANCELLED"

	SOPriorityLow    SalesOrderPriority = "LOW"
	SOPriorityNormal SalesOrderPriority = "NORMAL"
	SOPriorityHigh   SalesOrderPriority = "HIGH"
	SOPriorityUrgent SalesOrderPriority = "URGENT"
)

type SalesOrder struct {
	ID              uuid.UUID          `gorm:"type:uuid;primary_key" json:"id"`
	OrderNo         string             `gorm:"uniqueIndex;size:50;not null" json:"order_no"`
	CustomerName    string             `gorm:"size:255;not null" json:"customer_name"`
	CustomerEmail   string             `gorm:"size:255" json:"customer_email"`
	CustomerPhone   string             `gorm:"size:20" json:"customer_phone"`
	CustomerAddress string             `gorm:"type:text" json:"customer_address"`
	WarehouseID     *uuid.UUID         `gorm:"type:uuid" json:"warehouse_id"`
	OrderDate       *time.Time         `json:"order_date"`
	DeliveryDate    *time.Time         `json:"delivery_date"`
	Subtotal        float64            `gorm:"default:0" json:"subtotal"`
	TaxAmount       float64            `gorm:"default:0" json:"tax_amount"`
	DiscountAmount  float64            `gorm:"default:0" json:"discount_amount"`
	TotalAmount     float64            `gorm:"default:0" json:"total_amount"`
	Status          SalesOrderStatus   `gorm:"default:DRAFT" json:"status"`
	Priority        SalesOrderPriority `gorm:"default:NORMAL" json:"priority"`
	Notes           string             `gorm:"type:text" json:"notes"`
	CreatedBy       *uuid.UUID         `gorm:"type:uuid" json:"created_by"`
	ConfirmedBy     *uuid.UUID         `gorm:"type:uuid" json:"confirmed_by"`
	ConfirmedAt     *time.Time         `json:"confirmed_at"`
	CreatedAt       time.Time          `json:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at"`
	Warehouse       *Warehouse         `gorm:"foreignKey:WarehouseID" json:"warehouse,omitempty"`
	Creator         *User              `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Items           []SalesOrderItem   `gorm:"foreignKey:SalesOrderID" json:"items,omitempty"`
}

func (so *SalesOrder) BeforeCreate(tx *gorm.DB) error {
	if so.ID == uuid.Nil {
		so.ID = uuid.New()
	}
	return nil
}

type SalesOrderItem struct {
	ID           uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	SalesOrderID uuid.UUID  `gorm:"type:uuid;not null" json:"sales_order_id"`
	ProductID    uuid.UUID  `gorm:"type:uuid;not null" json:"product_id"`
	Quantity     int        `gorm:"not null" json:"quantity"`
	UnitPrice    float64    `gorm:"not null" json:"unit_price"`
	TotalPrice   float64    `gorm:"not null" json:"total_price"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	SalesOrder   SalesOrder `gorm:"foreignKey:SalesOrderID" json:"sales_order,omitempty"`
	Product      Product    `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

func (soi *SalesOrderItem) BeforeCreate(tx *gorm.DB) error {
	if soi.ID == uuid.Nil {
		soi.ID = uuid.New()
	}
	return nil
}

type AuditLog struct {
	ID         uuid.UUID              `gorm:"type:uuid;primary_key" json:"id"`
	UserID     *uuid.UUID             `gorm:"type:uuid" json:"user_id"`
	Action     string                 `gorm:"size:100;not null" json:"action"`
	EntityType string                 `gorm:"size:50;not null" json:"entity_type"`
	EntityID   *uuid.UUID             `gorm:"type:uuid" json:"entity_id"`
	OldValues  map[string]interface{} `gorm:"type:jsonb" json:"old_values"`
	NewValues  map[string]interface{} `gorm:"type:jsonb" json:"new_values"`
	IPAddress  string                 `gorm:"size:45" json:"ip_address"`
	CreatedAt  time.Time              `json:"created_at"`
	User       *User                  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (al *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if al.ID == uuid.Nil {
		al.ID = uuid.New()
	}
	return nil
}

type NotificationType string

const (
	NotificationInfo    NotificationType = "INFO"
	NotificationSuccess NotificationType = "SUCCESS"
	NotificationWarning NotificationType = "WARNING"
	NotificationError   NotificationType = "ERROR"
)

type Notification struct {
	ID        uuid.UUID        `gorm:"type:uuid;primary_key" json:"id"`
	UserID    uuid.UUID        `gorm:"type:uuid;not null" json:"user_id"`
	Title     string           `gorm:"size:255;not null" json:"title"`
	Message   string           `gorm:"type:text;not null" json:"message"`
	Type      NotificationType `gorm:"default:INFO" json:"type"`
	IsRead    bool             `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time        `json:"created_at"`
	User      User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}
