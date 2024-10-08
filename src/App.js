import { ethers } from "ethers";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Provider } from "react-redux";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
} from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { createStore } from "redux";
import "react-toastify/dist/ReactToastify.css";
import {
  Package,
  Truck,
  Store,
  Search,
  Menu,
  X,
  User,
  Edit,
  Circle,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
} from "lucide-react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClientProvider,
  QueryClient,
} from "react-query";
import "./index.css";
import SupplyChainManagementABI from './abi/SupplyChainManagement.json';
import { motion } from "framer-motion";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

// Set up contract details
// const CONTRACT_ADDRESS = "0x8464135c8F25Da09e49BC8782676a84730C318bC"; // Change to your deployed contract address

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Redux Actions
const ADD_TRANSACTION = "ADD_TRANSACTION";
const SET_TRANSACTIONS = "SET_TRANSACTIONS";

export const addTransaction = (transaction) => ({
  type: ADD_TRANSACTION,
  payload: transaction,
});

export const setTransactions = (transactions) => ({
  type: SET_TRANSACTIONS,
  payload: transactions,
});

// Redux Reducer
const initialState = {
  transactions: [],
};

const transactionReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADD_TRANSACTION:
      const newTransaction = action.payload;
      const existingTransaction = state.transactions.find(
        (tx) => tx.transactionHash === newTransaction.transactionHash
      );
      if (existingTransaction) {
        return state;
      }
      return {
        ...state,
        transactions: [...state.transactions, newTransaction],
      };
    case SET_TRANSACTIONS:
      return {
        ...state,
        transactions: action.payload,
      };
    default:
      return state;
  }
};

const store = createStore(transactionReducer);

const useContract = () => {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [roles, setRoles] = useState({
    owner: null,
    manufacturer: null,
    distributor: null,
    retailer: null,
  });

  const initializeContract = useCallback(async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Check if the current network is Polygon Amoy testnet
        const network = await provider.getNetwork();
        const amoyChainId = '0x13882'; // 80002 in hexadecimal

        if (network.chainId.toString(16) !== amoyChainId.slice(2)) {
          // If not on Amoy testnet, request to switch
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: amoyChainId }],
            });
          } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              toast.error("Please add the Polygon Amoy network to your wallet manually.");
              return;
            }
            throw switchError;
          }
        }

        const signer = await provider.getSigner();
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          SupplyChainManagementABI.abi,
          signer
        );

        setContract(contractInstance);
        setAccount(await signer.getAddress());

        const [owner, manufacturer, distributor, retailer] = await Promise.all([
          contractInstance.owner(),
          contractInstance.manufacturer(),
          contractInstance.distributor(),
          contractInstance.retailer(),
        ]);

        setRoles({ owner, manufacturer, distributor, retailer });

        window.ethereum.on("accountsChanged", ([newAccount]) => {
          setAccount(newAccount);
          window.location.reload();
        });

        return contractInstance;
      } catch (error) {
        console.error("Failed to initialize Ethereum connection:", error);
        toast.error("Failed to connect to Ethereum wallet.");
      }
    } else {
      toast.error("Ethereum wallet not found. Please install MetaMask.");
    }
  }, []);

  useEffect(() => {
    initializeContract();
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
      }
    };
  }, [initializeContract]);

  return { contract, account, roles };
};

// Utility Components
const Input = ({ className, ...props }) => (
  <input
    className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7E60BF] text-gray-200 placeholder-gray-400 ${className}`}
    {...props}
  />
);

const Button = ({ children, className = "", disabled, ...props }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`bg-gradient-to-r from-[#433878] to-[#7E60BF] text-white px-6 py-3 rounded-lg hover:from-[#7E60BF] hover:to-[#E4B1F0] transition duration-300 flex items-center justify-center shadow-lg ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
    } ${className}`}
    disabled={disabled}
    {...props}
  >
    {children}
  </motion.button>
);

const Card = ({ children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`bg-gray-800 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-xl border border-[#433878] ${className}`}
  >
    {children}
  </motion.div>
);

// Custom Hooks
const useProductStatus = (status) => {
  return useMemo(() => {
    const statusMap = {
      0: "Created",
      1: "Sent by Manufacturer",
      2: "Received by Distributor",
      3: "Sent by Distributor",
      4: "Received by Retailer",
    };
    return statusMap[status] || "Unknown";
  }, [status]);
};

// EditProductForm component
const EditProductForm = ({ product, onSubmit, onCancel }) => {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(
    ethers.formatEther(product.price.toString())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      id: product.id,
      name,
      description,
      price: ethers.parseEther(price),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-200"
        >
          Name
        </label>
        <Input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-200"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white bg-opacity-10 text-gray-200"
        />
      </div>
      <div>
        <label
          htmlFor="price"
          className="block text-sm font-medium text-gray-200"
        >
          Price (INR)
        </label>
        <Input
          type="number"
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          step="0.01"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button onClick={onCancel} className="bg-gray-600 hover:bg-gray-700">
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
};

// Utility function to generate unique IDs
const generateUniqueId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const App = () => {
  const { contract, account, roles } = useContract();

  const hasRole = useCallback(() => {
    if (!account) return false;
    return Object.values(roles).some(
      (role) => role && role.toLowerCase() === account.toLowerCase()
    );
  }, [account, roles]);

  const getUserRole = useCallback(() => {
    if (!account) return null;
    for (const [role, address] of Object.entries(roles)) {
      if (address && address.toLowerCase() === account.toLowerCase()) {
        return role;
      }
    }
    return null;
  }, [account, roles]);

  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-gray-900 text-gray-100">
          <Navbar
            account={account}
            hasRole={hasRole}
            getUserRole={getUserRole}
          />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route
                path="/"
                element={<Home roles={roles} account={account} />}
              />
              <Route
                path="/owner"
                element={
                  <ProtectedRoute
                    component={Owner}
                    contract={contract}
                    requiredAddress={roles.owner}
                    account={account}
                  />
                }
              />
              <Route
                path="/manufacturer"
                element={
                  <ProtectedRoute
                    component={Manufacturer}
                    contract={contract}
                    requiredAddress={roles.manufacturer}
                    account={account}
                  />
                }
              />
              <Route
                path="/distributor"
                element={
                  <ProtectedRoute
                    component={Distributor}
                    contract={contract}
                    requiredAddress={roles.distributor}
                    account={account}
                  />
                }
              />
              <Route
                path="/retailer"
                element={
                  <ProtectedRoute
                    component={Retailer}
                    contract={contract}
                    requiredAddress={roles.retailer}
                    account={account}
                  />
                }
              />
              <Route
                path="/track"
                element={
                  <ProtectedRoute
                    component={ProductTrackingPage}
                    contract={contract}
                    requiredAddress={Object.values(roles)}
                    account={account}
                  />
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute
                    component={() => <TransactionHistory contract={contract} />}
                    contract={contract}
                    requiredAddress={Object.values(roles)}
                    account={account}
                  />
                }
              />
            </Routes>
          </main>
        </div>
        <ToastContainer position="bottom-right" autoClose={5000} theme="dark" />
      </Router>
    </Provider>
  );
};

const Navbar = ({ account, hasRole, getUserRole }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-900 shadow-md border-b border-[#433878] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <motion.span 
              className="text-2xl font-bold text-[#E4B1F0]"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              ChainFlow
            </motion.span>
          </div>
          <div className="hidden sm:flex sm:items-center sm:space-x-8">
            <NavLink to="/">Home</NavLink>
            {hasRole() && (
              <>
                <NavLink to="/track">Track Product</NavLink>
                <NavLink to="/history">Transaction History</NavLink>
              </>
            )}
            {account ? (
              <div className="text-sm font-medium text-[#E4B1F0] bg-[#433878] px-4 py-2 rounded-full">
                {getUserRole()}: {account.slice(0, 6)}...{account.slice(-4)}
              </div>
            ) : (
              <Button onClick={() => {}}>Connect Wallet</Button>
            )}
          </div>
          {/* Mobile menu button */}
          <div className="sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden bg-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <NavLink to="/">Home</NavLink>
            {hasRole() && (
              <>
                <NavLink to="/track">Track Product</NavLink>
                <NavLink to="/history">Transaction History</NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLink = ({ to, children }) => (
  <Link
    to={to}
    className="px-3 py-2 rounded-md text-sm font-medium text-[#E4B1F0] hover:text-[#FFE1FF] hover:bg-[#433878] transition duration-300"
  >
    {children}
  </Link>
);

const Home = ({ roles, account }) => {
  const roleCards = [
    { title: "Owner", icon: User, path: "/owner", address: roles.owner },
    { title: "Manufacturer", icon: Package, path: "/manufacturer", address: roles.manufacturer },
    { title: "Distributor", icon: Truck, path: "/distributor", address: roles.distributor },
    { title: "Retailer", icon: Store, path: "/retailer", address: roles.retailer },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gradient-to-r from-[#433878] to-[#7E60BF] py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Welcome to ChainFlow
          </motion.h1>
          <motion.p 
            className="text-xl sm:text-2xl text-[#FFE1FF] max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Revolutionizing supply chain management with blockchain technology. 
            Track products, manage inventory, and ensure transparency like never before.
          </motion.p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <motion.h2 
          className="text-3xl font-bold text-[#E4B1F0] mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Select Your Role
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roleCards.map((role, index) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
            >
              <RoleCard
                title={role.title}
                icon={role.icon}
                path={role.path}
                isActive={account && role.address && account.toLowerCase() === role.address.toLowerCase()}
              />
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

const RoleCard = ({ title, icon: Icon, path, isActive }) => (
  <Link
    to={path}
    className={`block p-6 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ${
      isActive ? 'border-2 border-[#7E60BF]' : 'border border-gray-700'
    }`}
  >
    <div className="flex items-center space-x-4">
      <div className={`p-3 rounded-full ${isActive ? 'bg-[#7E60BF]' : 'bg-gray-700'}`}>
        <Icon size={24} className={isActive ? 'text-white' : 'text-[#E4B1F0]'} />
      </div>
      <div>
        <h3 className={`text-xl font-semibold ${isActive ? 'text-[#E4B1F0]' : 'text-white'}`}>
          {title}
        </h3>
        <p className={`mt-2 text-sm ${isActive ? 'text-[#FFE1FF]' : 'text-gray-400'}`}>
          {isActive ? 'Access Granted' : 'Access Restricted'}
        </p>
      </div>
    </div>
    <div className="mt-4 flex items-center text-[#7E60BF] hover:text-[#E4B1F0]">
      <span className="text-sm font-medium">Enter Dashboard</span>
      <ChevronRight size={16} className="ml-1" />
    </div>
  </Link>
);

const ProtectedRoute = ({
  component: Component,
  requiredAddress,
  account,
  ...rest
}) => {
  if (!account) {
    return <Navigate to="/" replace />;
  }

  const hasAccess = Array.isArray(requiredAddress)
    ? requiredAddress.some(
        (address) => address && account.toLowerCase() === address.toLowerCase()
      )
    : account.toLowerCase() === requiredAddress?.toLowerCase();

  if (!hasAccess) {
    toast.error("You don't have permission to access this page.");
    return <Navigate to="/" replace />;
  }

  return <Component {...rest} />;
};

const Owner = ({ contract }) => {
  const [manufacturer, setManufacturer] = useState("");
  const [distributor, setDistributor] = useState("");
  const [retailer, setRetailer] = useState("");
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [isLoading, setIsLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!contract) return;
    try {
      setIsLoading(true);
      const productCount = await contract.getProductCount();
      const allProducts = [];
      for (let i = 1; i <= productCount; i++) {
        const product = await contract.getProduct(i);
        if (product.id.toString() !== "0") {
          allProducts.push(product);
        }
      }
      setProducts(allProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Unable to load products. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const validateAddresses = () => {
    if (
      !ethers.isAddress(manufacturer) ||
      !ethers.isAddress(distributor) ||
      !ethers.isAddress(retailer)
    ) {
      toast.error("Please enter valid Ethereum addresses for all roles");
      return false;
    }
    return true;
  };

  const setAddresses = async () => {
    if (!contract) {
      toast.error("Unable to connect to blockchain. Please try again later.");
      return;
    }

    if (!validateAddresses()) return;

    try {
      setIsLoading(true);
      const tx = await contract.setAddresses(
        manufacturer,
        distributor,
        retailer
      );
      await tx.wait();
      toast.success("Supply chain roles updated successfully");
    } catch (error) {
      console.error("Transaction failed:", error);
      toast.error("Unable to update supply chain roles. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (productId, name, description, price) => {
    if (!contract) return;
    try {
      setIsLoading(true);
      const tx = await contract.updateProductDetails(
        productId,
        name,
        description,
        ethers.parseEther(price.toString())
      );
      await tx.wait();
      toast.success("Product updated successfully");
      setEditingProduct(null);
      await fetchProducts();
    } catch (error) {
      console.error("Failed to update product:", error);
      toast.error("Unable to update product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeFilter = async () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error("Please select both start and end dates");
      return;
    }

    try {
      setIsLoading(true);
      const startTimestamp = Math.floor(
        new Date(dateRange.start).getTime() / 1000
      );
      const endTimestamp = Math.floor(new Date(dateRange.end).getTime() / 1000);

      const filteredProductIds = await contract.getProductsByDateRange(
        startTimestamp,
        endTimestamp
      );

      const filteredProducts = await Promise.all(
        filteredProductIds.map((id) => contract.getProduct(id))
      );

      setProducts(filteredProducts);
    } catch (error) {
      console.error("Failed to filter products:", error);
      toast.error("Unable to filter products. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-8 text-[#E4B1F0]">Owner Dashboard</h2>

      <Card>
        <div className="flex items-center mb-6">
          <User size={28} className="text-[#7E60BF] mr-3" />
          <h3 className="text-2xl font-semibold text-[#E4B1F0]">Set Supply Chain Addresses</h3>
        </div>
        <div className="space-y-4">
          <Input
            placeholder="Manufacturer Address"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
          <Input
            placeholder="Distributor Address"
            value={distributor}
            onChange={(e) => setDistributor(e.target.value)}
          />
          <Input
            placeholder="Retailer Address"
            value={retailer}
            onChange={(e) => setRetailer(e.target.value)}
          />
          <Button onClick={setAddresses} disabled={isLoading} className="mt-6">
            {isLoading ? "Processing..." : "Set Addresses"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center mb-6">
          <Calendar size={28} className="text-[#7E60BF] mr-3" />
          <h3 className="text-2xl font-semibold text-[#E4B1F0]">Filter Products by Date</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
          <Button onClick={handleDateRangeFilter} disabled={isLoading}>
            {isLoading ? "Filtering..." : "Filter Products"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center mb-6">
          <Package size={28} className="text-[#7E60BF] mr-3" />
          <h3 className="text-2xl font-semibold text-[#E4B1F0]">Manage Products</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id.toString()}
              className="bg-gray-700 rounded-lg p-4 shadow"
            >
              {editingProduct === product.id.toString() ? (
                <EditProductForm
                  product={product}
                  onUpdate={handleUpdateProduct}
                  onCancel={() => setEditingProduct(null)}
                  isLoading={isLoading}
                />
              ) : (
                <div>
                  <h4 className="font-semibold text-[#E4B1F0]">
                    Product {product.id.toString()}
                  </h4>
                  <p>Name: {product.name}</p>
                  <p>Description: {product.description}</p>
                  <p>Price: {ethers.formatEther(product.price)} INR</p>
                  <Button
                    onClick={() => setEditingProduct(product.id.toString())}
                    className="mt-4"
                  >
                    Edit Product
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const setupEventListeners = (contract, dispatch) => {
  if (!contract) return;

  contract.removeAllListeners();

  const handleEvent = (eventName, callback) => {
    try {
      contract.on(eventName, callback);
    } catch (error) {
      console.error(`Failed to set up ${eventName} listener:`, error);
    }
  };

  handleEvent("ProductCreated", (productId, manufacturer, timestamp, event) => {
    dispatch(
      addTransaction({
        productId: productId.toString(),
        action: "Created",
        performer: manufacturer,
        timestamp: timestamp.toString(),
        transactionHash: event.transactionHash,
      })
    );
    toast.success(`New product added to supply chain`);
  });

  handleEvent("ProductSent", (productId, from, to, timestamp, event) => {
    dispatch(
      addTransaction({
        productId: productId.toString(),
        action: "Sent",
        from,
        to,
        timestamp: timestamp.toString(),
        transactionHash: event.transactionHash,
      })
    );
    toast.success(`Product ${productId} sent successfully`);
  });

  handleEvent("ProductReceived", (productId, receiver, timestamp, event) => {
    dispatch(
      addTransaction({
        productId: productId.toString(),
        action: "Received",
        performer: receiver,
        timestamp: timestamp.toString(),
        transactionHash: event.transactionHash,
      })
    );
    toast.success(`Product ${productId} received successfully`);
  });
};

const Manufacturer = ({ contract }) => {
  const queryClient = useQueryClient();
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
  });

  const { data: products = [], isLoading, error } = useQuery(
    ["manufacturerProducts", contract?.address],
    async () => {
      if (!contract) throw new Error("Contract not initialized");
      const productsData = await contract.getProductsCreated();
      return productsData.map((product) => ({
        ...product,
        id: product.id.toString(),
        name: product.name || "N/A",
        description: product.description || "N/A",
        price: ethers.formatEther(product.price),
      }));
    },
    {
      enabled: !!contract,
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  );

  const createProductMutation = useMutation(
    async (newProduct) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.createProduct(
        newProduct.name,
        newProduct.description,
        ethers.parseEther(newProduct.price)
      );
      await tx.wait();
    },
    {
      onSuccess: () => {
        const toastId = generateUniqueId('product-created');
        toast.success("Product created successfully!", { toastId });
        setNewProduct({ name: "", description: "", price: "" });
        queryClient.invalidateQueries("products");
      },
      onError: (error) => {
        const toastId = generateUniqueId('product-create-error');
        console.error("Error creating product:", error);
        toast.error(`Error creating product: ${error.message}`, { toastId });
      },
    }
  );

  const sendProductMutation = useMutation(
    async (productId) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.sendProductByManufacturer(productId);
      await tx.wait();
    },
    {
      onSuccess: (_, productId) => {
        const toastId = generateUniqueId(`product-sent-${productId}`);
        toast.success(`Product ${productId} sent successfully!`, { toastId });
        queryClient.invalidateQueries("products");
      },
      onError: (error) => {
        const toastId = generateUniqueId('product-send-error');
        console.error("Error sending product:", error);
        toast.error(`Error sending product: ${error.message}`, { toastId });
      },
    }
  );

  const handleCreateProduct = useCallback(
    (e) => {
      e.preventDefault();
      if (!newProduct.name.trim()) {
        toast.error("Product name is required");
        return;
      }
      if (!newProduct.description.trim()) {
        toast.error("Product description is required");
        return;
      }
      if (isNaN(newProduct.price) || parseFloat(newProduct.price) <= 0) {
        toast.error("Please enter a valid price greater than 0");
        return;
      }
      createProductMutation.mutate(newProduct);
    },
    [newProduct, createProductMutation]
  );

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({ ...prev, [name]: value }));
  }, []);

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6 text-[#E4B1F0]">Manufacturer Dashboard</h2>
      
      <form onSubmit={handleCreateProduct} className="mb-8">
        <div className="flex items-center mb-4">
          <Package size={24} className="text-[#7E60BF] mr-2" />
          <h3 className="text-xl font-semibold text-[#E4B1F0]">Create New Product</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="text"
            name="name"
            value={newProduct.name}
            onChange={handleInputChange}
            placeholder="Product Name"
            required
          />
          <Input
            type="number"
            name="price"
            value={newProduct.price}
            onChange={handleInputChange}
            placeholder="Price in INR"
            step="0.01"
            min="0"
            required
          />
        </div>
        <textarea
          name="description"
          value={newProduct.description}
          onChange={handleInputChange}
          placeholder="Product Description"
          className="w-full px-4 py-2 mt-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7E60BF] text-gray-200 placeholder-gray-400"
          required
        />
        <Button
          type="submit"
          className="mt-4"
          disabled={createProductMutation.isLoading}
        >
          {createProductMutation.isLoading ? "Creating..." : "Create Product"}
        </Button>
      </form>

      <h3 className="text-xl font-semibold mb-4 text-[#E4B1F0]">Created Products</h3>
      {isLoading ? (
        <p>Loading products...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-gray-700 p-4 rounded-lg">
              <p className="font-semibold text-[#E4B1F0]">Product ID: {product.id}</p>
              <p>Name: {product.name}</p>
              <p>Description: {product.description}</p>
              <p>Price: {product.price} INR</p>
              <Button
                onClick={() => sendProductMutation.mutate(product.id)}
                className="mt-2"
                disabled={sendProductMutation.isLoading}
              >
                {sendProductMutation.isLoading ? "Sending..." : "Send to Distributor"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const Distributor = ({ contract }) => {
  const queryClient = useQueryClient();

  const { data: receivableProducts, isLoading: isLoadingReceivable } = useQuery(
    "receivableProducts",
    async () => {
      if (!contract) throw new Error("Contract not initialized");
      const products = await contract.getProductsSentByManufacturer();
      return products.map((product) => ({
        ...product,
        id: product.id.toString(),
        name: product.name || "N/A",
        description: product.description || "N/A",
        price: product.price ? ethers.formatEther(product.price) : "N/A",
      }));
    },
    {
      enabled: !!contract,
      refetchInterval: 5000,
    }
  );

  const { data: receivedProducts, isLoading: isLoadingReceived } = useQuery(
    "receivedProducts",
    async () => {
      if (!contract) throw new Error("Contract not initialized");
      const products = await contract.getProductsReceivedByDistributor();
      return products.map((product) => ({
        ...product,
        id: product.id.toString(),
        name: product.name || "N/A",
        description: product.description || "N/A",
        price: product.price ? ethers.formatEther(product.price) : "N/A",
      }));
    },
    {
      enabled: !!contract,
      refetchInterval: 5000,
    }
  );

  const receiveProductMutation = useMutation(
    async (productId) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.receiveProductByDistributor(productId);
      await tx.wait();
    },
    {
      onSuccess: (_, productId) => {
        const toastId = generateUniqueId(`product-received-${productId}`);
        toast.success(`Product ${productId} received successfully!`, { toastId });
        queryClient.invalidateQueries(["receivableProducts", "receivedProducts"]);
      },
      onError: (error) => {
        const toastId = generateUniqueId('product-receive-error');
        console.error("Error receiving product:", error);
        toast.error(`Error receiving product: ${error.message}`, { toastId });
      },
    }
  );

  const sendProductMutation = useMutation(
    async (productId) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.sendProductByDistributor(productId);
      await tx.wait();
    },
    {
      onSuccess: (_, productId) => {
        const toastId = generateUniqueId(`product-sent-${productId}`);
        toast.success(`Product ${productId} sent successfully!`, { toastId });
        queryClient.invalidateQueries(["receivedProducts"]);
      },
      onError: (error) => {
        const toastId = generateUniqueId('product-send-error');
        console.error("Error sending product:", error);
        toast.error(`Error sending product: ${error.message}`, { toastId });
      },
    }
  );

  if (isLoadingReceivable || isLoadingReceived) return <div>Loading...</div>;

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6 text-[#E4B1F0]">Distributor Dashboard</h2>

      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Truck size={24} className="text-[#7E60BF] mr-2" />
          <h3 className="text-xl font-semibold text-[#E4B1F0]">Receivable Products</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {receivableProducts?.map((product) => (
            <div key={product.id} className="bg-gray-700 p-4 rounded-lg">
              <p className="font-semibold text-[#E4B1F0]">Product ID: {product.id}</p>
              <p>Name: {product.name}</p>
              <p>Description: {product.description}</p>
              <p>Price: {product.price} INR</p>
              <Button
                onClick={() => receiveProductMutation.mutate(product.id)}
                className="mt-2"
                disabled={receiveProductMutation.isLoading}
              >
                {receiveProductMutation.isLoading ? "Receiving..." : "Receive Product"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center mb-4">
          <Package size={24} className="text-[#7E60BF] mr-2" />
          <h3 className="text-xl font-semibold text-[#E4B1F0]">Received Products</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {receivedProducts?.map((product) => (
            <div key={product.id} className="bg-gray-700 p-4 rounded-lg">
              <p className="font-semibold text-[#E4B1F0]">Product ID: {product.id}</p>
              <p>Name: {product.name}</p>
              <p>Description: {product.description}</p>
              <p>Price: {product.price} INR</p>
              <Button
                onClick={() => sendProductMutation.mutate(product.id)}
                className="mt-2"
                disabled={sendProductMutation.isLoading}
              >
                {sendProductMutation.isLoading ? "Sending..." : "Send to Retailer"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const Retailer = ({ contract }) => {
  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading,
    error,
  } = useQuery(
    "retailerProducts",
    async () => {
      if (!contract) throw new Error("Contract not initialized");
      const productsData = await contract.getProductsSentByDistributor();
      return productsData.map((product) => ({
        ...product,
        id: product.id?.toString() || "Unknown",
        name: product.name || "Unnamed Product",
        description: product.description || "No description",
        price: product.price ? ethers.formatEther(product.price) : "N/A",
      }));
    },
    {
      enabled: !!contract,
      refetchInterval: 5000,
    }
  );

  const receiveProductMutation = useMutation(
    async (productId) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.receiveProductByRetailer(productId);
      await tx.wait();
    },
    {
      onSuccess: (_, productId) => {
        const toastId = generateUniqueId(`retailer-received-${productId}`);
        toast.success(`Product ${productId} received successfully!`, { toastId });
        queryClient.setQueryData(["retailerProducts"], (oldData) => {
          return oldData
            ? oldData.filter((product) => product.id !== productId.toString())
            : [];
        });
      },
      onError: (error) => {
        const toastId = generateUniqueId('retailer-receive-error');
        console.error("Error receiving product:", error);
        toast.error(`Error receiving product: ${error.message}`, { toastId });
      },
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6 text-[#E4B1F0]">Retailer Dashboard</h2>
      
      <div className="flex items-center mb-4">
        <Package size={24} className="text-[#7E60BF] mr-2" />
        <h3 className="text-xl font-semibold text-[#E4B1F0]">Receivable Products</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map((product) => (
          <div key={product.id} className="bg-gray-700 p-4 rounded-lg">
            <p className="font-semibold text-[#E4B1F0]">Product ID: {product.id}</p>
            <p>Name: {product.name}</p>
            <p>Description: {product.description}</p>
            <p>Price: {product.price} INR</p>
            <Button
              onClick={() => receiveProductMutation.mutate(product.id)}
              className="mt-2"
              disabled={receiveProductMutation.isLoading}
            >
              {receiveProductMutation.isLoading
                ? "Receiving..."
                : "Receive Product"}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

const ProductTrackingPage = ({ contract }) => {
  const [productId, setProductId] = useState("");

  const {
    data: product,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['product', productId],
    () => fetchProduct(contract, productId),
    {
      enabled: false,
      retry: false,
      onError: (err) => {
        console.error("Error fetching product:", err);
      }
    }
  );

  const debouncedFetch = useCallback((id) => {
    const delayedFetch = debounce((productId) => {
      if (productId && !isNaN(productId)) {
        refetch();
      }
    }, 500);

    delayedFetch(id);

    // Cleanup function to cancel the debounce on unmount or re-render
    return () => delayedFetch.cancel();
  }, [refetch]);

  useEffect(() => {
    const cleanup = debouncedFetch(productId);
    return cleanup;
  }, [productId, debouncedFetch]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setProductId(value);
  };

  const statusString = useProductStatus(product?.product?.status);

  return (
    <>
      <Card className="mb-8">
        <div className="flex items-center mb-6">
          <Search size={24} className="text-[#7E60BF] mr-3" />
          <h2 className="text-2xl font-semibold text-[#E4B1F0]">Track Product</h2>
        </div>
        <div className="flex items-center space-x-4">
          <Input
            type="text"
            value={productId}
            onChange={handleInputChange}
            placeholder="Enter Product ID"
            className="flex-grow"
          />
        </div>
      </Card>

      {isLoading && (
        <Card className="mb-8">
          <p className="text-gray-200">Loading product details...</p>
        </Card>
      )}

      {error && (
        <Card className="mb-8 bg-[#433878] border-[#7E60BF]">
          <div className="flex items-center space-x-3">
            <AlertCircle size={24} className="text-[#E4B1F0]" />
            <p className="text-[#E4B1F0] font-medium">
              {error.message === "Product not found" 
                ? "Product not found. Please check the ID and try again." 
                : "An error occurred while fetching the product. Please try again."}
            </p>
          </div>
        </Card>
      )}

      {product && (
        <>
          <Card className="mb-8">
            <div className="flex items-center mb-6">
              <Package size={24} className="text-[#7E60BF] mr-3" />
              <h3 className="text-2xl font-semibold text-[#E4B1F0]">Product Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="ID" value={product.product.id.toString()} />
              <DetailItem label="Name" value={product.product.name} />
              <DetailItem label="Description" value={product.product.description} />
              <DetailItem
                label="Price"
                value={`${ethers.formatEther(product.product.price)} INR`}
              />
              <DetailItem label="Status" value={statusString} />
            </div>
          </Card>
          
          <Card className="mb-8">
            <SupplyChainVisualization status={product.product.status} />
          </Card>
          
          <Card>
            <TransactionHistory contract={contract} productId={product.product.id.toString()} />
          </Card>
        </>
      )}
    </>
  );
};

// Debounce function
function debounce(func, wait) {
  let timeout;
  function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }
  executedFunction.cancel = () => {
    clearTimeout(timeout);
  };
  return executedFunction;
}

const ProductDetails = ({
  product,
  transactions,
  history,
  statusString,
  contract,
  account,
  roles,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const isOwner =
    account &&
    roles.owner &&
    account.toLowerCase() === roles.owner.toLowerCase();

  const editProductMutation = useMutation(
    async (updatedProduct) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.updateProduct(
        updatedProduct.id,
        updatedProduct.name,
        updatedProduct.description,
        updatedProduct.price
      );
      await tx.wait();
    },
    {
      onSuccess: () => {
        toast.success("Product updated successfully");
        setIsEditing(false);
      },
      onError: (error) => {
        console.error("Error updating product:", error);
        toast.error(`Error updating product: ${error.message}`);
      },
    }
  );

  const handleEditSubmit = (updatedProduct) => {
    editProductMutation.mutate({
      ...updatedProduct,
      price: ethers.parseEther(updatedProduct.price),
    });
  };

  return (
    <>
      <Card className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-[#E4B1F0]">
            Product Details
          </h3>
          {!isEditing && isOwner && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center text-[#7E60BF] hover:text-[#E4B1F0]"
            >
              <Edit size={16} className="mr-1" />
              Edit
            </button>
          )}
        </div>
        {isEditing ? (
          <EditProductForm
            product={product}
            onSubmit={handleEditSubmit}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="ID" value={product.id.toString()} />
            <DetailItem label="Name" value={product.name} />
            <DetailItem label="Description" value={product.description} />
            <DetailItem
              label="Price"
              value={`${ethers.formatEther(product.price)} INR`}
            />
            <DetailItem label="Status" value={statusString} />
          </div>
        )}
      </Card>
      <SupplyChainVisualization status={product.status} />
      <TransactionHistory contract={contract} productId={product.id.toString()} />
    </>
  );
};

const DetailItem = ({ label, value }) => (
  <div>
    <p className="text-sm font-medium text-[#7E60BF]">{label}</p>
    <p className="mt-1 text-sm text-gray-200">{value}</p>
  </div>
);

const SupplyChainVisualization = ({ status }) => {
  const stages = [
    { name: "Created", icon: <Package /> },
    { name: "Sent by Manufacturer", icon: <Truck /> },
    { name: "Received by Distributor", icon: <Store /> },
    { name: "Sent by Distributor", icon: <Truck /> },
    { name: "Received by Retailer", icon: <Store /> },
  ];

  return (
    <Card className="mt-6">
      <h3 className="text-xl font-semibold mb-4 text-[#E4B1F0]">
        Supply Chain Progress
      </h3>
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.name}>
            <div
              className={`flex flex-col items-center ${
                index <= status ? "text-[#E4B1F0]" : "text-gray-500"
              }`}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-800">
                {index < status ? (
                  <CheckCircle className="w-8 h-8" />
                ) : index === status ? (
                  <Circle className="w-8 h-8" />
                ) : (
                  stage.icon
                )}
              </div>
              <span className="mt-2 text-xs text-center">{stage.name}</span>
            </div>
            {index < stages.length - 1 && (
              <div
                className={`flex-grow h-0.5 ${
                  index < status ? "bg-[#7E60BF]" : "bg-gray-600"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};

const TransactionHistory = ({ contract, productId = null }) => {
  const { data: transactions, isLoading, error } = useQuery(
    ["transactionHistory", contract?.address, productId],
    async () => {
      if (!contract) throw new Error("Contract not initialized");

      const transactionFilter = contract.filters.TransactionPerformed(productId);
      const transactionEvents = await contract.queryFilter(transactionFilter);

      const [owner, manufacturer, distributor, retailer] = await Promise.all([
        contract.owner(),
        contract.manufacturer(),
        contract.distributor(),
        contract.retailer(),
      ]);

      const roleMap = {
        [owner.toLowerCase()]: "Owner",
        [manufacturer.toLowerCase()]: "Manufacturer",
        [distributor.toLowerCase()]: "Distributor",
        [retailer.toLowerCase()]: "Retailer",
      };

      const transactionMap = new Map();

      for (const event of transactionEvents) {
        const tx = {
          productId: event.args.productId.toString(),
          action: event.args.transactionType,
          performer: roleMap[event.args.performer.toLowerCase()] || "Unknown",
          timestamp: event.args.timestamp.toString(),
          transactionHash: event.transactionHash,
        };

        // Use transactionHash as a unique identifier
        if (!transactionMap.has(tx.transactionHash) || 
            Number(tx.timestamp) > Number(transactionMap.get(tx.transactionHash).timestamp)) {
          transactionMap.set(tx.transactionHash, tx);
        }
      }

      const uniqueTransactions = Array.from(transactionMap.values());
      return uniqueTransactions.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    },
    {
      enabled: !!contract,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  if (isLoading) return <div>Loading transaction history...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-[#433878]">
      <div className="bg-gradient-to-r from-[#433878] to-[#7E60BF] px-8 py-6">
        <div className="flex items-center">
          <Clock size={28} className="text-white mr-3" />
          <h2 className="text-2xl font-bold text-white">Transaction History</h2>
        </div>
      </div>
      {transactions.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <Package className="mx-auto h-16 w-16 text-[#7E60BF] mb-4" />
          <p>No transactions recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#433878]">
          {transactions.map((tx) => (
            <div
              key={tx.transactionHash}
              className="p-6 hover:bg-[#433878] transition duration-150 ease-in-out"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {tx.action === "Product Created" && (
                    <div className="bg-green-900 rounded-full p-2 relative">
                      <Package className="text-green-400 h-6 w-6" />
                      <Plus className="text-green-400 h-3 w-3 absolute top-0 right-0" />
                    </div>
                  )}
                  {tx.action === "Sent by Manufacturer" && (
                    <div className="bg-blue-900 rounded-full p-2">
                      <Truck className="text-blue-400 h-6 w-6" />
                    </div>
                  )}
                  {tx.action === "Received by Distributor" && (
                    <div className="bg-purple-900 rounded-full p-2">
                      <Store className="text-purple-400 h-6 w-6" />
                    </div>
                  )}
                  {tx.action === "Sent by Distributor" && (
                    <div className="bg-blue-900 rounded-full p-2">
                      <Truck className="text-blue-400 h-6 w-6" />
                    </div>
                  )}
                  {tx.action === "Received by Retailer" && (
                    <div className="bg-purple-900 rounded-full p-2">
                      <Store className="text-purple-400 h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-200">
                    Product {tx.productId} - {tx.action}
                  </p>
                  {/* Removed the "By: Unknown" line */}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm text-[#E4B1F0]">
                    {new Date(Number(tx.timestamp) * 1000).toLocaleString()}
                  </p>
                  <a
                    href={`https://www.oklink.com/amoy/tx/${tx.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#7E60BF] hover:text-[#E4B1F0]"
                  >
                    View on OKLink
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const fetchProduct = async (contract, productId) => {
  if (!contract || !productId) {
    throw new Error("Invalid contract or product ID");
  }

  const [product, transactions, history] = await Promise.all([
    contract.getProduct(productId),
    contract.getProductTransactions(productId),
    contract.getProductHistory(productId),
  ]);

  if (product.id.toString() === "0") {
    throw new Error("Product not found");
  }

  return {
    product: {
      id: product.id,
      name: product.name || "N/A",
      description: product.description || "N/A",
      price: product.price,
      status: product.status || 0,
    },
    transactions: transactions.map((tx) => ({
      productId,
      transactionType: tx.transactionType || "Unknown",
      performer: tx.performer || "Unknown",
      timestamp: tx.timestamp ? tx.timestamp.toString() : "0",
    })),
    history: history.filter(
      (timestamp) =>
        timestamp &&
        (typeof timestamp === "object"
          ? !timestamp.isZero()
          : Number(timestamp) > 0)
    ),
  };
};

export {
  Manufacturer,
  Distributor,
  Retailer,
  ProductTrackingPage,
  TransactionHistory,
  setupEventListeners,
  SupplyChainVisualization,
  ProductDetails,
};

const AppWrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        <App />
      </Provider>
    </QueryClientProvider>
  );
};

export default AppWrapper;
