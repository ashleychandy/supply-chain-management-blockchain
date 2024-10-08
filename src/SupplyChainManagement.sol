    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.13;

    contract SupplyChainManagement {

        enum ProductStatus { Created, SentByManufacturer, ReceivedByDistributor, SentByDistributor, ReceivedByRetailer, ReturnRequested }

        struct Product {
            uint256 id;
            string name;
            string description;
            uint256 price;
            ProductStatus status;
            uint256 createdAt;
            uint256 sentByManufacturerAt;
            uint256 receivedByDistributorAt;
            uint256 sentByDistributorAt;
            uint256 receivedByRetailerAt;
        }

        struct Transaction {
        uint256 productId;
        string transactionType;
        address performer;
        uint256 timestamp;
    }

        struct ReturnRequest {
            uint256 id;
            uint256 productId;
            address requester;
            string reason;
            bool approved;
            bool processed;
            uint256 timestamp;
        }

        address public owner;
        address public manufacturer;
        address public distributor;
        address public retailer;

        uint256 private _productIdCounter;
        uint256 private _returnRequestCounter;
        mapping(uint256 => Product) public products;
        mapping(address => uint256[]) private userProducts;
        mapping(ProductStatus => uint256[]) private productsByStage;
        mapping(uint256 => Transaction[]) private productTransactions;
        mapping(uint256 => ReturnRequest) private returnRequests;

        event ProductCreated(uint256 indexed productId, address indexed manufacturer, uint256 timestamp);
        event ProductSent(uint256 indexed productId, address indexed from, address indexed to, uint256 timestamp);
        event ProductReceived(uint256 indexed productId, address indexed receiver, uint256 timestamp);
        event ProductStatusChanged(uint256 indexed productId, ProductStatus oldStatus, ProductStatus newStatus, uint256 timestamp);
        event TransactionPerformed(uint256 indexed productId, string transactionType, address indexed performer, uint256 timestamp);
        event ProductStageUpdated(uint256 indexed productId, ProductStatus currentStage, uint256 timestamp);
        event AddressesSet(address indexed manufacturer, address indexed distributor, address indexed retailer, uint256 timestamp);
        event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
        event ReturnRequested(uint256 indexed returnRequestId, uint256 indexed productId, address indexed requester, string reason, uint256 timestamp);
        event ReturnProcessed(uint256 indexed returnRequestId, bool approved, uint256 timestamp);

        modifier onlyOwner() {
            require(msg.sender == owner, "Only owner can call this function");
            _;
        }

        modifier onlyManufacturer() {
            require(msg.sender == manufacturer, "Only manufacturer can call this function");
            _;
        }

        modifier onlyDistributor() {
            require(msg.sender == distributor, "Only distributor can call this function");
            _;
        }

        modifier onlyRetailer() {
            require(msg.sender == retailer, "Only retailer can call this function");
            _;
        }

        modifier validProductId(uint256 _productId) {
            require(_productId > 0 && _productId <= _productIdCounter, "Invalid product ID");
            _;
        }

        constructor() {
            owner = msg.sender;
            _productIdCounter = 0;
        }

        function setAddresses(address _manufacturer, address _distributor, address _retailer) external onlyOwner {
            require(_manufacturer != address(0) && _distributor != address(0) && _retailer != address(0), "Invalid address");
            manufacturer = _manufacturer;
            distributor = _distributor;
            retailer = _retailer;
            emit AddressesSet(_manufacturer, _distributor, _retailer, block.timestamp);
        }

        function transferOwnership(address newOwner) external onlyOwner {
            require(newOwner != address(0), "New owner is the zero address");
            emit OwnershipTransferred(owner, newOwner);
            owner = newOwner;
        }

        function createProduct(string memory _name, string memory _description, uint256 _price) external onlyManufacturer {
            require(bytes(_name).length > 0, "Name cannot be empty");
            require(_price > 0, "Price must be greater than zero");
            
            _productIdCounter++;
            uint256 newProductId = _productIdCounter;
            
            Product memory newProduct = Product({
                id: newProductId,
                name: _name,
                description: _description,
                price: _price,
                status: ProductStatus.Created,
                createdAt: block.timestamp,
                sentByManufacturerAt: 0,
                receivedByDistributorAt: 0,
                sentByDistributorAt: 0,
                receivedByRetailerAt: 0
            });
            
            products[newProductId] = newProduct;
            userProducts[msg.sender].push(newProductId);
            addProductToStage(newProductId, ProductStatus.Created);
            addTransaction(newProductId, "Product Created");


            emit ProductCreated(newProductId, msg.sender, block.timestamp);
            emit ProductStatusChanged(newProductId, ProductStatus.Created, ProductStatus.Created, block.timestamp);
            emit TransactionPerformed(newProductId, "Product Created", msg.sender, block.timestamp);
            emit ProductStageUpdated(newProductId, ProductStatus.Created, block.timestamp);
        }

        function sendProductByManufacturer(uint256 _productId) external onlyManufacturer validProductId(_productId) {
            Product storage product = products[_productId];
            require(product.status == ProductStatus.Created, "Product is not in the correct state");

            ProductStatus oldStatus = product.status;
            product.status = ProductStatus.SentByManufacturer;
            product.sentByManufacturerAt = block.timestamp;
            
            removeProductFromStage(_productId, oldStatus);
            addProductToStage(_productId, ProductStatus.SentByManufacturer);
            addTransaction(_productId, "Sent by Manufacturer");

            
            emit ProductSent(_productId, msg.sender, distributor, block.timestamp);
            emit ProductStatusChanged(_productId, oldStatus, product.status, block.timestamp);
            emit TransactionPerformed(_productId, "Sent by Manufacturer", msg.sender, block.timestamp);
            emit ProductStageUpdated(_productId, product.status, block.timestamp);
        }

        function receiveProductByDistributor(uint256 _productId) external onlyDistributor validProductId(_productId) {
            Product storage product = products[_productId];
            require(product.status == ProductStatus.SentByManufacturer, "Product is not in the correct state");

            ProductStatus oldStatus = product.status;
            product.status = ProductStatus.ReceivedByDistributor;
            product.receivedByDistributorAt = block.timestamp;
            userProducts[msg.sender].push(_productId);
            
            removeProductFromStage(_productId, oldStatus);
            addProductToStage(_productId, ProductStatus.ReceivedByDistributor);
            addTransaction(_productId, "Received by Distributor");
            
            emit ProductReceived(_productId, msg.sender, block.timestamp);
            emit ProductStatusChanged(_productId, oldStatus, product.status, block.timestamp);
            emit TransactionPerformed(_productId, "Received by Distributor", msg.sender, block.timestamp);
            emit ProductStageUpdated(_productId, product.status, block.timestamp);
        }

        function sendProductByDistributor(uint256 _productId) external onlyDistributor validProductId(_productId) {
            Product storage product = products[_productId];
            require(product.status == ProductStatus.ReceivedByDistributor, "Product is not in the correct state");

            ProductStatus oldStatus = product.status;
            product.status = ProductStatus.SentByDistributor;
            product.sentByDistributorAt = block.timestamp;
            
            removeProductFromStage(_productId, oldStatus);
            addProductToStage(_productId, ProductStatus.SentByDistributor);
            addTransaction(_productId, "Sent by Distributor");

            emit ProductSent(_productId, msg.sender, retailer, block.timestamp);
            emit ProductStatusChanged(_productId, oldStatus, product.status, block.timestamp);
            emit TransactionPerformed(_productId, "Sent by Distributor", msg.sender, block.timestamp);
            emit ProductStageUpdated(_productId, product.status, block.timestamp);
        }

        function receiveProductByRetailer(uint256 _productId) external onlyRetailer validProductId(_productId) {
            Product storage product = products[_productId];
            require(product.status == ProductStatus.SentByDistributor, "Product is not in the correct state");

            ProductStatus oldStatus = product.status;
            product.status = ProductStatus.ReceivedByRetailer;
            product.receivedByRetailerAt = block.timestamp;
            userProducts[msg.sender].push(_productId);
            
            removeProductFromStage(_productId, oldStatus);
            addProductToStage(_productId, ProductStatus.ReceivedByRetailer);
            addTransaction(_productId, "Received by Retailer");

            
            emit ProductReceived(_productId, msg.sender, block.timestamp);
            emit ProductStatusChanged(_productId, oldStatus, product.status, block.timestamp);
            emit TransactionPerformed(_productId, "Received by Retailer", msg.sender, block.timestamp);
            emit ProductStageUpdated(_productId, product.status, block.timestamp);
        }

        function getProduct(uint256 _productId) external view validProductId(_productId) returns (Product memory) {
            return products[_productId];
        }

        function getProductCount() external view returns (uint256) {
            return _productIdCounter;
        }

        function getUserProducts(address _user) external view returns (uint256[] memory) {
            return userProducts[_user];
        }

        function getProductsByStatus(ProductStatus _status) external view returns (uint256[] memory) {
            return productsByStage[_status];
        }

        function getProductHistory(uint256 _productId) external view validProductId(_productId) returns (uint256[] memory) {
            Product memory product = products[_productId];
            
            uint256[] memory history = new uint256[](5);
            history[0] = product.createdAt;
            history[1] = product.sentByManufacturerAt;
            history[2] = product.receivedByDistributorAt;
            history[3] = product.sentByDistributorAt;
            history[4] = product.receivedByRetailerAt;
            
            return history;
        }

        function getProductsByDateRange(uint256 _startDate, uint256 _endDate) external view returns (uint256[] memory) {
            require(_startDate <= _endDate, "Invalid date range");
            
            uint256[] memory productIds = new uint256[](_productIdCounter);
            uint256 count = 0;
            
            for (uint256 i = 1; i <= _productIdCounter; i++) {
                if (products[i].createdAt >= _startDate && products[i].createdAt <= _endDate) {
                    productIds[count] = i;
                    count++;
                }
            }
            
            // Resize the array to remove empty slots
            assembly {
                mstore(productIds, count)
            }
            
            return productIds;
        }

        function updateProductDetails(uint256 _productId, string memory _name, string memory _description, uint256 _price) external onlyOwner validProductId(_productId) {
            require(bytes(_name).length > 0, "Name cannot be empty");
            require(_price > 0, "Price must be greater than zero");
            
            Product storage product = products[_productId];
            
            product.name = _name;
            product.description = _description;
            product.price = _price;
            
            emit TransactionPerformed(_productId, "Product Details Updated", msg.sender, block.timestamp);
        }

        function addProductToStage(uint256 _productId, ProductStatus _status) internal {
            productsByStage[_status].push(_productId);
        }

        function removeProductFromStage(uint256 _productId, ProductStatus _status) internal {
            uint256[] storage stageProducts = productsByStage[_status];
            for (uint256 i = 0; i < stageProducts.length; i++) {
                if (stageProducts[i] == _productId) {
                    stageProducts[i] = stageProducts[stageProducts.length - 1];
                    stageProducts.pop();
                    break;
                }
            }
        }

        // New functions to retrieve all products with their data for each stage
        function getProductsCreated() external view returns (Product[] memory) {
            return getProductsInStage(ProductStatus.Created);
        }

        function getProductsSentByManufacturer() external view returns (Product[] memory) {
            return getProductsInStage(ProductStatus.SentByManufacturer);
        }

        function getProductsReceivedByDistributor() external view returns (Product[] memory) {
            return getProductsInStage(ProductStatus.ReceivedByDistributor);
        }

        function getProductsSentByDistributor() external view returns (Product[] memory) {
            return getProductsInStage(ProductStatus.SentByDistributor);
        }

        function getProductsReceivedByRetailer() external view returns (Product[] memory) {
    uint256[] memory productIds = productsByStage[ProductStatus.ReceivedByRetailer];
    uint256 validCount = 0;
    
    for (uint256 i = 0; i < productIds.length; i++) {
        if (products[productIds[i]].status != ProductStatus.ReturnRequested) {
            validCount++;
        }
    }
    
    Product[] memory validProducts = new Product[](validCount);
    uint256 index = 0;
    
    for (uint256 i = 0; i < productIds.length; i++) {
        if (products[productIds[i]].status != ProductStatus.ReturnRequested) {
            validProducts[index] = products[productIds[i]];
            index++;
        }
    }
    
    return validProducts;
}

        function getProductsInStage(ProductStatus _status) internal view returns (Product[] memory) {
            uint256[] memory productIds = productsByStage[_status];
            Product[] memory stageProducts = new Product[](productIds.length);
            
            for (uint256 i = 0; i < productIds.length; i++) {
                stageProducts[i] = products[productIds[i]];
            }
            
            return stageProducts;
        }

        function addTransaction(uint256 _productId, string memory _transactionType) internal {
        Transaction memory newTransaction = Transaction({
            productId: _productId,
            transactionType: _transactionType,
            performer: msg.sender,
            timestamp: block.timestamp
        });
        productTransactions[_productId].push(newTransaction);
        emit TransactionPerformed(_productId, _transactionType, msg.sender, block.timestamp);
        }

        function getProductTransactions(uint256 _productId) external view returns (Transaction[] memory) {
        return productTransactions[_productId];
        }


    }