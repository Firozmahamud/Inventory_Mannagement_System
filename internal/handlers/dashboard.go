package handlers

import (
	"net/http"

	"inventory-system/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DashboardStats struct {
	TotalProducts  int64   `json:"total_products"`
	TotalStock     int64   `json:"total_stock"`
	LowStockItems  int64   `json:"low_stock_items"`
	TotalSales     float64 `json:"total_sales"`
	TotalPurchases float64 `json:"total_purchases"`
}

func GetDashboardStats(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var totalProducts int64
		db.Model(&models.Product{}).Where("is_active = ?", true).Count(&totalProducts)

		var totalStock int64
		db.Model(&models.Inventory{}).Select("COALESCE(SUM(quantity), 0)").Scan(&totalStock)

		var lowStockItems int64
		db.Raw(`
			SELECT COUNT(DISTINCT i.product_id)
			FROM inventory i
			JOIN products p ON i.product_id = p.id
			WHERE i.quantity < p.reorder_point AND p.is_active = true
		`).Scan(&lowStockItems)

		var totalSales float64
		db.Model(&models.SalesOrder{}).Where("status != ?", "CANCELLED").Select("COALESCE(SUM(total_amount), 0)").Scan(&totalSales)

		var totalPurchases float64
		db.Model(&models.PurchaseOrder{}).Where("status != ?", "CANCELLED").Select("COALESCE(SUM(total_amount), 0)").Scan(&totalPurchases)

		stats := DashboardStats{
			TotalProducts:  totalProducts,
			TotalStock:     totalStock,
			LowStockItems:  lowStockItems,
			TotalSales:     totalSales,
			TotalPurchases: totalPurchases,
		}

		c.JSON(http.StatusOK, stats)
	}
}

type ChartData struct {
	Labels   []string  `json:"labels"`
	Datasets []float64 `json:"datasets"`
}

func GetSalesChart(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var sales []struct {
			Date  string  `json:"date"`
			Total float64 `json:"total"`
		}

		db.Raw(`
			SELECT DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as total
			FROM sales_orders
			WHERE created_at >= NOW() - INTERVAL '30 days' AND status != 'CANCELLED'
			GROUP BY DATE(created_at)
			ORDER BY date
		`).Scan(&sales)

		labels := []string{}
		values := []float64{}

		for _, s := range sales {
			labels = append(labels, s.Date)
			values = append(values, s.Total)
		}

		c.JSON(http.StatusOK, ChartData{
			Labels:   labels,
			Datasets: values,
		})
	}
}

func GetStockChart(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var stock []struct {
			Category string `json:"category"`
			Total    int64  `json:"total"`
		}

		db.Raw(`
			SELECT COALESCE(c.name, 'Uncategorized') as category, COALESCE(SUM(i.quantity), 0) as total
			FROM inventory i
			JOIN products p ON i.product_id = p.id
			LEFT JOIN categories c ON p.category_id = c.id
			GROUP BY c.name
			ORDER BY total DESC
			LIMIT 10
		`).Scan(&stock)

		labels := []string{}
		values := []float64{}

		for _, s := range stock {
			labels = append(labels, s.Category)
			values = append(values, float64(s.Total))
		}

		c.JSON(http.StatusOK, ChartData{
			Labels:   labels,
			Datasets: values,
		})
	}
}
