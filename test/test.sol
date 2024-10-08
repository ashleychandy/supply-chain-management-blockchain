// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/SupplyChainManagement.sol";
import "forge-std/console.sol";

contract SupplyChainManagementTest is Test {
    SupplyChainManagement public supplyChain;
    address public owner;
    address public manufacturer;
    address public distributor;
    address public retailer;
    address public customer;

    function setUp() public {
        owner = address(this);
        manufacturer = address(0x1);
        distributor = address(0x2);
        retailer = address(0x3);
        customer = address(0x4);

        supplyChain = new SupplyChainManagement();
        supplyChain.setAddresses(manufacturer, distributor, retailer);
    }

    function testProductCreationAndSupplyChainFlow() public {
        // Create product
        vm.prank(manufacturer);
        supplyChain.createProduct("Test Product", "A test product", 1 ether);

        // Check product details
        SupplyChainManagement.Product memory product = supplyChain.getProduct(1);
        assertEq(product.id, 1, "Product ID mismatch");
        assertEq(product.name, "Test Product", "Product name mismatch");
        assertEq(product.description, "A test product", "Product description mismatch");
        assertEq(product.price, 1 ether, "Product price mismatch");
        assertEq(uint(product.status), uint(SupplyChainManagement.ProductStatus.Created), "Product status mismatch");

        // Manufacturer sends product
        vm.prank(manufacturer);
        supplyChain.sendProductByManufacturer(1);
        product = supplyChain.getProduct(1);
        assertEq(uint(product.status), uint(SupplyChainManagement.ProductStatus.SentByManufacturer), "Product status mismatch after sending");

        // Distributor receives product
        vm.prank(distributor);
        supplyChain.receiveProductByDistributor(1);
        product = supplyChain.getProduct(1);
        assertEq(uint(product.status), uint(SupplyChainManagement.ProductStatus.ReceivedByDistributor), "Product status mismatch after distributor receiving");

        // Distributor sends product
        vm.prank(distributor);
        supplyChain.sendProductByDistributor(1);
        product = supplyChain.getProduct(1);
        assertEq(uint(product.status), uint(SupplyChainManagement.ProductStatus.SentByDistributor), "Product status mismatch after distributor sending");

        // Retailer receives product
        vm.prank(retailer);
        supplyChain.receiveProductByRetailer(1);
        product = supplyChain.getProduct(1);
        assertEq(uint(product.status), uint(SupplyChainManagement.ProductStatus.ReceivedByRetailer), "Product status mismatch after retailer receiving");
    }

    function testAccessControl() public {
        // Try to create product as non-manufacturer
        vm.prank(distributor);
        vm.expectRevert("Only manufacturer can call this function");
        supplyChain.createProduct("Unauthorized Product", "An unauthorized product", 1 ether);

        // Create a valid product
        vm.prank(manufacturer);
        supplyChain.createProduct("Test Product", "A test product", 1 ether);

        // Try to send product as non-manufacturer
        vm.prank(distributor);
        vm.expectRevert("Only manufacturer can call this function");
        supplyChain.sendProductByManufacturer(1);

        // Move product to distributor
        vm.prank(manufacturer);
        supplyChain.sendProductByManufacturer(1);

        // Try to receive product as non-distributor
        vm.prank(retailer);
        vm.expectRevert("Only distributor can call this function");
        supplyChain.receiveProductByDistributor(1);
    }

    function testProductManagement() public {
        // Create product
        vm.prank(manufacturer);
        supplyChain.createProduct("Original Product", "Original description", 1 ether);

        // Update product details
        supplyChain.updateProductDetails(1, "Updated Product", "Updated description", 2 ether);

        // Check updated product details
        SupplyChainManagement.Product memory product = supplyChain.getProduct(1);
        assertEq(product.id, 1, "Product ID mismatch");
        assertEq(product.name, "Updated Product", "Updated product name mismatch");
        assertEq(product.description, "Updated description", "Updated product description mismatch");
        assertEq(product.price, 2 ether, "Updated product price mismatch");
    }

    function testGetProductsByDateRange() public {
        // Create products at different times
        vm.prank(manufacturer);
        supplyChain.createProduct("Product 1", "Description 1", 1 ether);
        uint256 product1Time = block.timestamp;
        console.log("Product 1 created at:", product1Time);
        
        vm.warp(block.timestamp + 1 days);
        vm.prank(manufacturer);
        supplyChain.createProduct("Product 2", "Description 2", 2 ether);
        uint256 product2Time = block.timestamp;
        console.log("Product 2 created at:", product2Time);
        
        vm.warp(block.timestamp + 1 days);
        vm.prank(manufacturer);
        supplyChain.createProduct("Product 3", "Description 3", 3 ether);
        uint256 product3Time = block.timestamp;
        console.log("Product 3 created at:", product3Time);

        uint256 startTime = product1Time + 1;
        uint256 endTime = product3Time - 1;
        console.log("Start time:", startTime);
        console.log("End time:", endTime);

        // Get products created in the date range
        uint256[] memory productsInRange = supplyChain.getProductsByDateRange(startTime, endTime);
        
        console.log("Number of products in range:", productsInRange.length);
        for (uint i = 0; i < productsInRange.length; i++) {
            console.log("Product ID:", productsInRange[i]);
        }

        assertEq(productsInRange.length, 1, "Should return 1 product within the date range");

        // Check if the correct product is returned
        assertEq(productsInRange[0], 2, "Product in range should be Product 2");
    }

    function testProductQueries() public {
        // Create and move products through different stages
        vm.startPrank(manufacturer);
        supplyChain.createProduct("Product 1", "Description 1", 1 ether);
        supplyChain.createProduct("Product 2", "Description 2", 2 ether);
        supplyChain.sendProductByManufacturer(1);
        vm.stopPrank();

        vm.prank(distributor);
        supplyChain.receiveProductByDistributor(1);

        // Test getProductsCreated
        SupplyChainManagement.Product[] memory createdProducts = supplyChain.getProductsCreated();
        assertEq(createdProducts.length, 1, "Should have 1 created product");

        // Test getProductsSentByManufacturer
        SupplyChainManagement.Product[] memory sentByManufacturerProducts = supplyChain.getProductsSentByManufacturer();
        assertEq(sentByManufacturerProducts.length, 0, "Should have 0 products sent by manufacturer");

        // Test getProductsReceivedByDistributor
        SupplyChainManagement.Product[] memory receivedByDistributorProducts = supplyChain.getProductsReceivedByDistributor();
        assertEq(receivedByDistributorProducts.length, 1, "Should have 1 product received by distributor");

        // Test getProductTransactions
        SupplyChainManagement.Transaction[] memory transactions = supplyChain.getProductTransactions(1);
        assertEq(transactions.length, 3, "Should have 3 transactions for product 1");
        assertEq(transactions[0].transactionType, "Product Created", "First transaction should be Product Created");
        assertEq(transactions[1].transactionType, "Sent by Manufacturer", "Second transaction should be Sent by Manufacturer");
        assertEq(transactions[2].transactionType, "Received by Distributor", "Third transaction should be Received by Distributor");
    }
}