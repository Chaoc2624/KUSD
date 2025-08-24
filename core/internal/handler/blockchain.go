package handler

import (
	"math/big"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"usdk-backend/internal/service"
	"usdk-backend/pkg/utils"
)

type BlockchainHandler struct {
	blockchainService *service.BlockchainService
}

type TransferRequest struct {
	To     string `json:"to" binding:"required"`
	Amount string `json:"amount" binding:"required"`
}

type MintRequest struct {
	To     string `json:"to" binding:"required"`
	Amount string `json:"amount" binding:"required"`
}

type BurnRequest struct {
	Amount string `json:"amount" binding:"required"`
}

func NewBlockchainHandler(blockchainService *service.BlockchainService) *BlockchainHandler {
	return &BlockchainHandler{
		blockchainService: blockchainService,
	}
}

// USDK Token Endpoints

func (h *BlockchainHandler) GetTokenInfo(c *gin.Context) {
	tokenInfo, err := h.blockchainService.GetTokenInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(tokenInfo))
}

func (h *BlockchainHandler) GetBalance(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Address parameter is required"))
		return
	}

	balanceInfo, err := h.blockchainService.GetBalance(address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(balanceInfo))
}

func (h *BlockchainHandler) IsBlacklisted(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Address parameter is required"))
		return
	}

	isBlacklisted, err := h.blockchainService.IsBlacklisted(address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(map[string]interface{}{
		"address":       address,
		"isBlacklisted": isBlacklisted,
	}))
}

func (h *BlockchainHandler) IsPaused(c *gin.Context) {
	isPaused, err := h.blockchainService.IsPaused()
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(map[string]interface{}{
		"isPaused": isPaused,
	}))
}

func (h *BlockchainHandler) Transfer(c *gin.Context) {
	var req TransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(err.Error()))
		return
	}

	amount, ok := new(big.Int).SetString(req.Amount, 10)
	if !ok {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid amount format"))
		return
	}

	result, err := h.blockchainService.Transfer(req.To, amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(result))
}

func (h *BlockchainHandler) Mint(c *gin.Context) {
	var req MintRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(err.Error()))
		return
	}

	amount, ok := new(big.Int).SetString(req.Amount, 10)
	if !ok {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid amount format"))
		return
	}

	result, err := h.blockchainService.Mint(req.To, amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(result))
}

func (h *BlockchainHandler) Burn(c *gin.Context) {
	var req BurnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse(err.Error()))
		return
	}

	amount, ok := new(big.Int).SetString(req.Amount, 10)
	if !ok {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid amount format"))
		return
	}

	result, err := h.blockchainService.Burn(amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(result))
}

// ProofRegistry Endpoints

func (h *BlockchainHandler) GetProofBatch(c *gin.Context) {
	batchIdStr := c.Param("batchId")
	if batchIdStr == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Batch ID parameter is required"))
		return
	}

	batchId, ok := new(big.Int).SetString(batchIdStr, 10)
	if !ok {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid batch ID format"))
		return
	}

	batch, err := h.blockchainService.GetProofBatch(batchId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(batch))
}

func (h *BlockchainHandler) GetBatchCount(c *gin.Context) {
	count, err := h.blockchainService.GetBatchCount()
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(map[string]interface{}{
		"totalBatches": count.String(),
	}))
}

func (h *BlockchainHandler) GetBatchCountByType(c *gin.Context) {
	batchTypeStr := c.Param("batchType")
	if batchTypeStr == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Batch type parameter is required"))
		return
	}

	batchType, err := strconv.ParseUint(batchTypeStr, 10, 8)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid batch type format"))
		return
	}

	count, err := h.blockchainService.GetBatchCountByType(uint8(batchType))
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(map[string]interface{}{
		"batchType":    batchType,
		"totalBatches": count.String(),
	}))
}

func (h *BlockchainHandler) GetBatchesByType(c *gin.Context) {
	batchTypeStr := c.Param("batchType")
	if batchTypeStr == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Batch type parameter is required"))
		return
	}

	batchType, err := strconv.ParseUint(batchTypeStr, 10, 8)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid batch type format"))
		return
	}

	// Get query parameters for pagination
	offsetStr := c.DefaultQuery("offset", "0")
	limitStr := c.DefaultQuery("limit", "10")

	offset, ok := new(big.Int).SetString(offsetStr, 10)
	if !ok {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid offset format"))
		return
	}

	limit, ok := new(big.Int).SetString(limitStr, 10)
	if !ok {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid limit format"))
		return
	}

	batches, err := h.blockchainService.GetBatchesByType(uint8(batchType), offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse(err.Error()))
		return
	}

	// Convert []*big.Int to []string for JSON response
	batchIds := make([]string, len(batches))
	for i, batch := range batches {
		batchIds[i] = batch.String()
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(map[string]interface{}{
		"batchType": batchType,
		"offset":    offset.String(),
		"limit":     limit.String(),
		"batchIds":  batchIds,
	}))
}

// Utility Endpoints

func (h *BlockchainHandler) GetTransactionStatus(c *gin.Context) {
	txHash := c.Param("hash")
	if txHash == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Transaction hash parameter is required"))
		return
	}

	status, err := h.blockchainService.GetTransactionStatus(txHash)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse(err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(status))
}

func (h *BlockchainHandler) HealthCheck(c *gin.Context) {
	err := h.blockchainService.HealthCheck()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, utils.ErrorResponse("Blockchain connection failed"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(map[string]interface{}{
		"status":    "healthy",
		"network":   "sepolia",
		"timestamp": strconv.FormatInt(c.Request.Context().Value("timestamp").(int64), 10),
	}))
}