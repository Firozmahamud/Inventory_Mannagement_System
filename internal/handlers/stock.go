package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"inventory-system/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListStockTransactions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var transactions []models.StockTransaction
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		var total int64
		db.Model(&models.StockTransaction{}).Count(&total)

		if err := db.Offset(offset).Limit(limit).
			Preload("Product").
			Preload("FromWarehouse").Preload("ToWarehouse").
			Preload("FromLocation").Preload("ToLocation").
			Find(&transactions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":       transactions,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		})
	}
}

func generateTransactionNo(db *gorm.DB, prefix string) string {
	seqName := map[string]string{
		"STIN":  "stock_in_seq",
		"STOUT": "stock_out_seq",
		"STTR":  "stock_transfer_seq",
		"STADJ": "stock_adjustment_seq",
		"MOVE":  "stock_transfer_seq",
	}
	seq, ok := seqName[prefix]
	if !ok {
		seq = prefix + "_seq"
	}
	var nextVal int64
	db.Raw("SELECT nextval('" + seq + "')").Scan(&nextVal)
	return fmt.Sprintf("%s-%s-%06d", prefix, time.Now().Format("20060102"), nextVal)
}

func CreateStockIn(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		uid, _ := uuid.Parse(userID)

		var input struct {
			ProductID   uuid.UUID  `json:"product_id" binding:"required"`
			WarehouseID uuid.UUID  `json:"warehouse_id" binding:"required"`
			LocationID  *uuid.UUID `json:"location_id"`
			Quantity    int        `json:"quantity" binding:"required"`
			UnitCost    float64    `json:"unit_cost"`
			ReferenceNo string     `json:"reference_no"`
			Reason      string     `json:"reason"`
			Notes       string     `json:"notes"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if input.LocationID != nil {
			var location models.Location
			if err := db.First(&location, *input.LocationID).Error; err == nil {
				if location.WarehouseID != input.WarehouseID {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Location does not belong to the selected warehouse"})
					return
				}
				if location.MaxCapacity > 0 {
					var currentStock int
					db.Model(&models.Inventory{}).Where("location_id = ?", *input.LocationID).Select("COALESCE(SUM(quantity), 0)").Scan(&currentStock)
					if currentStock+input.Quantity > location.MaxCapacity {
						c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Exceeds bin capacity. Max: %d, Current: %d, Requested: %d", location.MaxCapacity, currentStock, input.Quantity)})
						return
					}
				}
			}
		}

		tx := db.Begin()

		now := time.Now()
		transaction := models.StockTransaction{
			TransactionNo:   generateTransactionNo(db, "STIN"),
			TransactionType: models.TransactionIn,
			ProductID:       input.ProductID,
			ToWarehouseID:   &input.WarehouseID,
			ToLocationID:    input.LocationID,
			Quantity:        input.Quantity,
			UnitCost:        input.UnitCost,
			TotalCost:       float64(input.Quantity) * input.UnitCost,
			ReferenceNo:     input.ReferenceNo,
			Reason:          input.Reason,
			Notes:           input.Notes,
			CreatedBy:       &uid,
			Status:          models.TransactionApproved,
		}

		if err := tx.Create(&transaction).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create stock in"})
			return
		}

		var inv models.Inventory
		query := tx.Where("product_id = ? AND warehouse_id = ?", input.ProductID, input.WarehouseID)
		if input.LocationID != nil {
			query = tx.Where("location_id = ?", *input.LocationID)
		} else {
			query = tx.Where("location_id IS NULL")
		}
		result := query.First(&inv)
		if result.Error == gorm.ErrRecordNotFound {
			inv = models.Inventory{
				ProductID:   input.ProductID,
				WarehouseID: input.WarehouseID,
				LocationID:  input.LocationID,
				Quantity:    input.Quantity,
				LastStockIn: &now,
			}
			tx.Create(&inv)
		} else {
			tx.Model(&inv).Update("quantity", gorm.Expr("quantity + ?", input.Quantity))
			tx.Model(&inv).Update("last_stock_in", &now)
		}

		tx.Commit()
		c.JSON(http.StatusCreated, transaction)
	}
}

func CreateStockOut(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		uid, _ := uuid.Parse(userID)

		var input struct {
			ProductID   uuid.UUID  `json:"product_id" binding:"required"`
			WarehouseID uuid.UUID  `json:"warehouse_id" binding:"required"`
			LocationID  *uuid.UUID `json:"location_id"`
			Quantity    int        `json:"quantity" binding:"required"`
			UnitCost    float64    `json:"unit_cost"`
			ReferenceNo string     `json:"reference_no"`
			Reason      string     `json:"reason"`
			Notes       string     `json:"notes"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		tx := db.Begin()

		var inv models.Inventory
		query := tx.Where("product_id = ? AND warehouse_id = ? AND quantity >= ?", input.ProductID, input.WarehouseID, input.Quantity)
		if input.LocationID != nil {
			query = tx.Where("location_id = ?", *input.LocationID)
		} else {
			query = tx.Where("location_id IS NULL")
		}
		if err := query.First(&inv).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient stock or product not found at location"})
			return
		}

		now := time.Now()
		transaction := models.StockTransaction{
			TransactionNo:   generateTransactionNo(db, "STOUT"),
			TransactionType: models.TransactionOut,
			ProductID:       input.ProductID,
			FromWarehouseID: &input.WarehouseID,
			FromLocationID:  input.LocationID,
			Quantity:        input.Quantity,
			UnitCost:        input.UnitCost,
			TotalCost:       float64(input.Quantity) * input.UnitCost,
			ReferenceNo:     input.ReferenceNo,
			Reason:          input.Reason,
			Notes:           input.Notes,
			CreatedBy:       &uid,
			Status:          models.TransactionApproved,
		}

		if err := tx.Create(&transaction).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create stock out"})
			return
		}

		tx.Model(&inv).Update("quantity", gorm.Expr("quantity - ?", input.Quantity))
		tx.Model(&inv).Update("last_stock_out", &now)

		var remainingQty = input.Quantity
		for remainingQty > 0 {
			var locationInv models.Inventory
			query := tx.Where("product_id = ? AND warehouse_id = ? AND quantity > 0", input.ProductID, input.WarehouseID)
			if input.LocationID != nil {
				query = tx.Where("location_id = ?", *input.LocationID)
			} else {
				query = tx.Where("location_id IS NULL")
			}
			query.Order("last_stock_in ASC").First(&locationInv)
			if locationInv.ID != uuid.Nil && locationInv.Quantity > 0 {
				deduct := remainingQty
				if deduct > locationInv.Quantity {
					deduct = locationInv.Quantity
				}
				tx.Model(&locationInv).Update("quantity", gorm.Expr("quantity - ?", deduct))
				remainingQty -= deduct
			} else {
				break
			}
		}

		tx.Commit()
		c.JSON(http.StatusCreated, transaction)
	}
}

func CreateStockTransfer(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		uid, _ := uuid.Parse(userID)

		var input struct {
			ProductID       uuid.UUID  `json:"product_id" binding:"required"`
			FromWarehouseID uuid.UUID  `json:"from_warehouse_id" binding:"required"`
			ToWarehouseID   uuid.UUID  `json:"to_warehouse_id" binding:"required"`
			FromLocationID  *uuid.UUID `json:"from_location_id"`
			ToLocationID    *uuid.UUID `json:"to_location_id"`
			Quantity        int        `json:"quantity" binding:"required"`
			ReferenceNo     string     `json:"reference_no"`
			Notes           string     `json:"notes"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		tx := db.Begin()

		var inv models.Inventory
		query := tx.Where("product_id = ? AND warehouse_id = ? AND quantity >= ?", input.ProductID, input.FromWarehouseID, input.Quantity)
		if input.FromLocationID != nil {
			query = tx.Where("location_id = ?", *input.FromLocationID)
		} else {
			query = tx.Where("location_id IS NULL")
		}
		if err := query.First(&inv).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient stock in source location"})
			return
		}

		now := time.Now()
		transaction := models.StockTransaction{
			TransactionNo:   generateTransactionNo(db, "STTR"),
			TransactionType: models.TransactionTransfer,
			ProductID:       input.ProductID,
			FromWarehouseID: &input.FromWarehouseID,
			ToWarehouseID:   &input.ToWarehouseID,
			FromLocationID:  input.FromLocationID,
			ToLocationID:    input.ToLocationID,
			Quantity:        input.Quantity,
			ReferenceNo:     input.ReferenceNo,
			Notes:           input.Notes,
			CreatedBy:       &uid,
			Status:          models.TransactionApproved,
		}

		if err := tx.Create(&transaction).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transfer"})
			return
		}

		if input.FromLocationID != nil {
			tx.Model(&models.Inventory{}).Where("product_id = ? AND location_id = ?", input.ProductID, *input.FromLocationID).Update("quantity", gorm.Expr("quantity - ?", input.Quantity))
		} else {
			tx.Model(&models.Inventory{}).Where("product_id = ? AND warehouse_id = ? AND location_id IS NULL", input.ProductID, input.FromWarehouseID).Update("quantity", gorm.Expr("quantity - ?", input.Quantity))
		}

		var toInv models.Inventory
		var toQuery *gorm.DB
		if input.ToLocationID != nil {
			toQuery = tx.Where("product_id = ? AND warehouse_id = ? AND location_id = ?", input.ProductID, input.ToWarehouseID, *input.ToLocationID)
		} else {
			toQuery = tx.Where("product_id = ? AND warehouse_id = ? AND location_id IS NULL", input.ProductID, input.ToWarehouseID)
		}
		if err := toQuery.First(&toInv).Error; err == gorm.ErrRecordNotFound {
			toInv = models.Inventory{
				ProductID:   input.ProductID,
				WarehouseID: input.ToWarehouseID,
				LocationID:  input.ToLocationID,
				Quantity:    input.Quantity,
				LastStockIn: &now,
			}
			tx.Create(&toInv)
		} else {
			tx.Model(&toInv).Update("quantity", gorm.Expr("quantity + ?", input.Quantity))
			tx.Model(&toInv).Update("last_stock_in", &now)
		}

		tx.Commit()
		c.JSON(http.StatusCreated, transaction)
	}
}

func CreateStockAdjustment(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		uid, _ := uuid.Parse(userID)

		var input struct {
			ProductID   uuid.UUID `json:"product_id" binding:"required"`
			WarehouseID uuid.UUID `json:"warehouse_id" binding:"required"`
			Quantity    int       `json:"quantity" binding:"required"`
			Reason      string    `json:"reason" binding:"required"`
			Notes       string    `json:"notes"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		tx := db.Begin()

		transaction := models.StockTransaction{
			TransactionNo:   generateTransactionNo(db, "STADJ"),
			TransactionType: models.TransactionAdjustment,
			ProductID:       input.ProductID,
			ToWarehouseID:   &input.WarehouseID,
			Quantity:        input.Quantity,
			Reason:          input.Reason,
			Notes:           input.Notes,
			CreatedBy:       &uid,
			Status:          models.TransactionApproved,
		}

		if err := tx.Create(&transaction).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create adjustment"})
			return
		}

		if input.Quantity != 0 {
			tx.Model(&models.Inventory{}).Where("product_id = ? AND warehouse_id = ?", input.ProductID, input.WarehouseID).Update("quantity", gorm.Expr("quantity + ?", input.Quantity))
		}

		tx.Commit()
		c.JSON(http.StatusCreated, transaction)
	}
}
