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
import SupplyChainManagementABI from "./abi/SupplyChainManagement.json";
import { motion } from "framer-motion";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

const toastCooldowns = new Map();

// Updated customToast function with cooldown
const customToast = (message, type = 'info', options = {}) => {
  const defaultOptions = {
    position: "bottom-right",
    autoClose: type === 'error' ? 2000 : 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    onClick: (event) => {
      // Prevent default behavior and stop propagation
      event.preventDefault();
      event.stopPropagation();
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // Generate a unique ID for this toast
  const toastId = `${type}-${message}`;

  // Check if this toast is in cooldown
  const now = Date.now();
  const cooldownTime = toastCooldowns.get(toastId);
  if (cooldownTime && now < cooldownTime) {
    return; // Still in cooldown, don't show the toast
  }

  // Set a new cooldown for this toast (3 seconds)
  toastCooldowns.set(toastId, now + 3000);

  // Show the toast
  if (!toast.isActive(toastId)) {
    switch (type) {
      case 'success':
        toast.success(message, { ...mergedOptions, toastId });
        break;
      case 'error':
        toast.error(message, { ...mergedOptions, toastId });
        break;
      case 'warning':
        toast.warn(message, { ...mergedOptions, toastId });
        break;
      default:
        toast.info(message, { ...mergedOptions, toastId });
    }
  }
};

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
        const amoyChainId = "0x13882"; // 80002 in hexadecimal

        if (network.chainId.toString(16) !== amoyChainId.slice(2)) {
          // If not on Amoy testnet, request to switch
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: amoyChainId }],
            });
          } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              customToast(
                "Please add the Polygon Amoy network to your wallet manually.",
                "error"
              );
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
        customToast("Failed to connect to Ethereum wallet.", "error");
      }
    } else {
      customToast("Ethereum wallet not found. Activating demo mode.", "info");
      setContract(null);
      setAccount(null);
      setRoles({
        owner: "0x1234...5678",
        manufacturer: "0x2345...6789",
        distributor: "0x3456...7890",
        retailer: "0x4567...8901",
      });
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
      price,
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

const App = () => {
  const { contract, account, roles } = useContract();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isWalletMissing, setIsWalletMissing] = useState(false);

  useEffect(() => {
    if (typeof window.ethereum === "undefined") {
      setIsWalletMissing(true);
      customToast("Ethereum wallet not detected. You can enable demo mode to explore the app.", "info", { autoClose: 5000 });
    }
  }, []);

  const hasRole = useCallback(() => {
    if (isDemoMode) return true;
    if (!account) return false;
    return Object.values(roles).some(
      (role) => role && role.toLowerCase() === account.toLowerCase()
    );
  }, [account, roles, isDemoMode]);

  const getUserRole = useCallback(() => {
    if (isDemoMode) return "Demo User";
    if (!account) return null;
    for (const [role, address] of Object.entries(roles)) {
      if (address && address.toLowerCase() === account.toLowerCase()) {
        return role;
      }
    }
    return null;
  }, [account, roles, isDemoMode]);

  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-gray-900 text-gray-100 relative">
          <Navbar
            account={account}
            hasRole={hasRole}
            getUserRole={getUserRole}
          />
          <main className="container mx-auto px-4 py-8">
            {isWalletMissing && !isDemoMode && (
              <Card className="mb-8 bg-[#433878] border-[#7E60BF]">
                <div className="flex items-center space-x-3">
                  <AlertCircle size={24} className="text-[#E4B1F0]" />
                  <p className="text-[#E4B1F0] font-medium">
                    No Ethereum wallet detected. To view actual data, please connect a wallet. Alternatively, you can enable demo mode to explore the app.
                  </p>
                </div>
              </Card>
            )}
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
                    isDemoMode={isDemoMode}
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
                    isDemoMode={isDemoMode}
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
                    isDemoMode={isDemoMode}
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
                    isDemoMode={isDemoMode}
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
                    isDemoMode={isDemoMode}
                  />
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute
                    component={() => <TransactionHistory contract={contract} isDemoMode={isDemoMode} />}
                    contract={contract}
                    requiredAddress={Object.values(roles)}
                    account={account}
                    isDemoMode={isDemoMode}
                  />
                }
              />
            </Routes>
          </main>
          <DemoModeToggle isDemoMode={isDemoMode} setIsDemoMode={setIsDemoMode} />
        </div>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          limit={3}
        />
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
    {
      title: "Manufacturer",
      icon: Package,
      path: "/manufacturer",
      address: roles.manufacturer,
    },
    {
      title: "Distributor",
      icon: Truck,
      path: "/distributor",
      address: roles.distributor,
    },
    {
      title: "Retailer",
      icon: Store,
      path: "/retailer",
      address: roles.retailer,
    },
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
            Track products, manage inventory, and ensure transparency like never
            before.
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
                isActive={
                  account &&
                  role.address &&
                  account.toLowerCase() === role.address.toLowerCase()
                }
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
      isActive ? "border-2 border-[#7E60BF]" : "border border-gray-700"
    }`}
  >
    <div className="flex items-center space-x-4">
      <div
        className={`p-3 rounded-full ${
          isActive ? "bg-[#7E60BF]" : "bg-gray-700"
        }`}
      >
        <Icon
          size={24}
          className={isActive ? "text-white" : "text-[#E4B1F0]"}
        />
      </div>
      <div>
        <h3
          className={`text-xl font-semibold ${
            isActive ? "text-[#E4B1F0]" : "text-white"
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-2 text-sm ${
            isActive ? "text-[#FFE1FF]" : "text-gray-400"
          }`}
        >
          {isActive ? "Access Granted" : "Access Restricted"}
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
  isDemoMode,
  ...rest
}) => {
  if (!account && !isDemoMode) {
    return <Navigate to="/" replace />;
  }

  const hasAccess = isDemoMode || (Array.isArray(requiredAddress)
    ? requiredAddress.some(
        (address) => address && account.toLowerCase() === address.toLowerCase()
      )
    : account.toLowerCase() === requiredAddress?.toLowerCase());

  if (!hasAccess && !isDemoMode) {
    customToast("You don't have permission to access this page.", "error");
    return <Navigate to="/" replace />;
  }

  return <Component {...rest} isDemoMode={isDemoMode} />;
};

const Owner = ({ contract, isDemoMode }) => {
  const [manufacturer, setManufacturer] = useState("");
  const [distributor, setDistributor] = useState("");
  const [retailer, setRetailer] = useState("");
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [isLoading, setIsLoading] = useState(false);

  const demoProducts = [
    { id: "1", name: "Demo Product 1", description: "This is a demo product", price: ethers.parseEther("10") },
    { id: "2", name: "Demo Product 2", description: "Another demo product", price: ethers.parseEther("20") },
  ];

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
      customToast("Unable to load products. Please try again later.", "error", { toastId: 'fetch-products-error', autoClose: 2000 });
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
      customToast("Please enter valid Ethereum addresses for all roles", "error", { toastId: 'invalid-addresses-error', autoClose: 2000 });
      return false;
    }
    return true;
  };

  const setAddresses = async () => {
    if (!contract) {
      customToast("Unable to connect to blockchain. Please try again later.", "error");
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
      customToast("Supply chain roles updated successfully", "success");
    } catch (error) {
      console.error("Transaction failed:", error);
      customToast("Unable to update supply chain roles. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (updatedProduct) => {
    if (!contract) return;
    try {
      setIsLoading(true);
      const tx = await contract.updateProductDetails(
        updatedProduct.id,
        updatedProduct.name,
        updatedProduct.description,
        ethers.parseEther(updatedProduct.price.toString())
      );
      await tx.wait();
      customToast("Product updated successfully", "success");
      setEditingProduct(null);
      await fetchProducts();
    } catch (error) {
      console.error("Failed to update product:", error);
      customToast("Unable to update product. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeFilter = async () => {
    if (!dateRange.start || !dateRange.end) {
      customToast("Please select both start and end dates", "error");
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
      customToast("Unable to filter products. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold mb-8 text-[#E4B1F0]">
        Owner Dashboard
      </h2>

      <Card>
        <div className="flex items-center mb-6">
          <User size={28} className="text-[#7E60BF] mr-3" />
          <h3 className="text-2xl font-semibold text-[#E4B1F0]">
            Set Supply Chain Addresses
          </h3>
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
          <h3 className="text-2xl font-semibold text-[#E4B1F0]">
            Filter Products by Date
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange({ ...dateRange, start: e.target.value })
            }
          />
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange({ ...dateRange, end: e.target.value })
            }
          />
          <Button onClick={handleDateRangeFilter} disabled={isLoading}>
            {isLoading ? "Filtering..." : "Filter Products"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center mb-6">
          <Package size={28} className="text-[#7E60BF] mr-3" />
          <h3 className="text-2xl font-semibold text-[#E4B1F0]">
            Manage Products
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(isDemoMode ? demoProducts : products).map((product) => (
            <div
              key={product.id.toString()}
              className="bg-gray-700 rounded-lg p-4 shadow"
            >
              {editingProduct === product.id.toString() ? (
                <EditProductForm
                  product={product}
                  onSubmit={handleUpdateProduct}
                  onCancel={() => setEditingProduct(null)}
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
              {isDemoMode && <p className="text-xs text-gray-400 mt-2">Demo Data</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const Manufacturer = ({ contract, isDemoMode }) => {
  const queryClient = useQueryClient();
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
  });

  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery(
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
        customToast("Product created successfully!", "success");
        setNewProduct({ name: "", description: "", price: "" });
        queryClient.invalidateQueries("products");
      },
      onError: (error) => {
        console.error("Error creating product:", error);
        let errorMessage = "Error creating product. Please try again.";
        if (error.message.includes("caller is not the manufacturer")) {
          errorMessage = "You don't have permission to create products.";
        }
        customToast(errorMessage, "error");
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
        customToast(`Product ${productId} sent successfully!`, "success");
        queryClient.invalidateQueries("products");
      },
      onError: (error) => {
        console.error("Error sending product:", error);
        let errorMessage = "Error sending product. Please try again.";
        if (error.message.includes("caller is not the manufacturer")) {
          errorMessage = "You don't have permission to send products.";
        }
        customToast(errorMessage, "error");
      },
    }
  );

  const handleCreateProduct = useCallback(
    (e) => {
      e.preventDefault();
      if (!newProduct.name.trim()) {
        customToast("Product name is required", "error", { toastId: 'create-product-name-error', autoClose: 2000 });
        return;
      }
      if (!newProduct.description.trim()) {
        customToast("Product description is required", "error", { toastId: 'create-product-description-error', autoClose: 2000 });
        return;
      }
      if (isNaN(newProduct.price) || parseFloat(newProduct.price) <= 0) {
        customToast("Please enter a valid price greater than 0", "error", { toastId: 'create-product-price-error', autoClose: 2000 });
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

  const demoProducts = [
    { id: "1", name: "Demo Product 1", description: "This is a demo product", price: "10.00" },
    { id: "2", name: "Demo Product 2", description: "Another demo product", price: "20.00" },
  ];

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6 text-[#E4B1F0]">
        Manufacturer Dashboard
      </h2>

      <form onSubmit={handleCreateProduct} className="mb-8">
        <div className="flex items-center mb-4">
          <Package size={24} className="text-[#7E60BF] mr-2" />
          <h3 className="text-xl font-semibold text-[#E4B1F0]">
            Create New Product
          </h3>
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

      <h3 className="text-xl font-semibold mb-4 text-[#E4B1F0]">
        Created Products
      </h3>
      {isLoading ? (
        <p>Loading products...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isDemoMode ? demoProducts : products).map((product) => (
            <div key={product.id} className="bg-gray-700 p-4 rounded-lg">
              <p className="font-semibold text-[#E4B1F0]">
                Product ID: {product.id}
              </p>
              <p>Name: {product.name}</p>
              <p>Description: {product.description}</p>
              <p>Price: {product.price} INR</p>
              <Button
                onClick={() => sendProductMutation.mutate(product.id)}
                className="mt-2"
                disabled={sendProductMutation.isLoading}
              >
                {sendProductMutation.isLoading
                  ? "Sending..."
                  : "Send to Distributor"}
              </Button>
              {isDemoMode && <p className="text-xs text-gray-400 mt-2">Demo Data</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const Distributor = ({ contract, isDemoMode }) => {
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
        customToast(`Product ${productId} received successfully!`, "success");
        queryClient.invalidateQueries([
          "receivableProducts",
          "receivedProducts",
        ]);
      },
      onError: (error) => {
        console.error("Error receiving product:", error);
        let errorMessage = "Error receiving product. Please try again.";
        if (error.message.includes("caller is not the distributor")) {
          errorMessage = "You don't have permission to receive products.";
        }
        customToast(errorMessage, "error");
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
        customToast(`Product ${productId} sent successfully!`, "success");
        queryClient.invalidateQueries(["receivedProducts"]);
      },
      onError: (error) => {
        console.error("Error sending product:", error);
        let errorMessage = "Error sending product. Please try again.";
        if (error.message.includes("caller is not the distributor")) {
          errorMessage = "You don't have permission to send products.";
        }
        customToast(errorMessage, "error");
      },
    }
  );

  const demoReceivableProducts = [
    { id: "1", name: "Demo Receivable 1", description: "This is a demo receivable product", price: "15.00" },
    { id: "2", name: "Demo Receivable 2", description: "Another demo receivable product", price: "25.00" },
  ];

  const demoReceivedProducts = [
    { id: "3", name: "Demo Received 1", description: "This is a demo received product", price: "30.00" },
    { id: "4", name: "Demo Received 2", description: "Another demo received product", price: "40.00" },
  ];

  if (isLoadingReceivable || isLoadingReceived) return <div>Loading...</div>;

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6 text-[#E4B1F0]">
        Distributor Dashboard
      </h2>

      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Truck size={24} className="text-[#7E60BF] mr-2" />
          <h3 className="text-xl font-semibold text-[#E4B1F0]">
            Receivable Products
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isDemoMode ? demoReceivableProducts : receivableProducts)?.map((product) => (
            <div key={product.id} className="bg-gray-700 p-4 rounded-lg">
              <p className="font-semibold text-[#E4B1F0]">
                Product ID: {product.id}
              </p>
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
              {isDemoMode && <p className="text-xs text-gray-400 mt-2">Demo Data</p>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center mb-4">
          <Package size={24} className="text-[#7E60BF] mr-2" />
          <h3 className="text-xl font-semibold text-[#E4B1F0]">
            Received Products
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isDemoMode ? demoReceivedProducts : receivedProducts)?.map((product) => (
            <div key={product.id} className="bg-gray-700 p-4 rounded-lg">
              <p className="font-semibold text-[#E4B1F0]">
                Product ID: {product.id}
              </p>
              <p>Name: {product.name}</p>
              <p>Description: {product.description}</p>
              <p>Price: {product.price} INR</p>
              <Button
                onClick={() => sendProductMutation.mutate(product.id)}
                className="mt-2"
                disabled={sendProductMutation.isLoading}
              >
                {sendProductMutation.isLoading
                  ? "Sending..."
                  : "Send to Retailer"}
              </Button>
              {isDemoMode && <p className="text-xs text-gray-400 mt-2">Demo Data</p>}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const Retailer = ({ contract, isDemoMode }) => {
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
        customToast(`Product ${productId} received successfully!`, "success");
        queryClient.setQueryData(["retailerProducts"], (oldData) => {
          return oldData
            ? oldData.filter((product) => product.id !== productId.toString())
            : [];
        });
      },
      onError: (error) => {
        console.error("Error receiving product:", error);
        let errorMessage = "Error receiving product. Please try again.";
        if (error.message.includes("caller is not the retailer")) {
          errorMessage = "You don't have permission to receive products.";
        }
        customToast(errorMessage, "error");
      },
    }
  );

  const demoProducts = [
    { id: "1", name: "Demo Product 1", description: "This is a demo product", price: "50.00" },
    { id: "2", name: "Demo Product 2", description: "Another demo product", price: "60.00" },
  ];

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6 text-[#E4B1F0]">
        Retailer Dashboard
      </h2>

      <div className="flex items-center mb-4">
        <Package size={24} className="text-[#7E60BF] mr-2" />
        <h3 className="text-xl font-semibold text-[#E4B1F0]">
          Receivable Products
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(isDemoMode ? demoProducts : products)?.map((product) => (
          <div key={product.id} className="bg-gray-700 p-4 rounded-lg">
            <p className="font-semibold text-[#E4B1F0]">
              Product ID: {product.id}
            </p>
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
            {isDemoMode && <p className="text-xs text-gray-400 mt-2">Demo Data</p>}
          </div>
        ))}
      </div>
    </Card>
  );
};

const ProductTrackingPage = ({ contract, isDemoMode }) => {
  const [productId, setProductId] = useState("");

  const {
    data: product,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ["product", productId],
    () => fetchProduct(contract, productId),
    {
      enabled: false,
      retry: false,
      onError: (err) => {
        console.error("Error fetching product:", err);
      },
    }
  );

  const debouncedFetch = useCallback(
    (id) => {
      const delayedFetch = debounce((productId) => {
        if (productId && !isNaN(productId)) {
          refetch();
        }
      }, 500);

      delayedFetch(id);

      // Cleanup function to cancel the debounce on unmount or re-render
      return () => delayedFetch.cancel();
    },
    [refetch]
  );

  useEffect(() => {
    const cleanup = debouncedFetch(productId);
    return cleanup;
  }, [productId, debouncedFetch]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setProductId(value);
  };

  const statusString = useProductStatus(product?.product?.status);

  const demoProduct = {
    product: {
      id: "1",
      name: "Demo Product",
      description: "This is a demo product for tracking",
      price: ethers.parseEther("100"),
      status: 2,
    },
  };

  return (
    <>
      <Card className="mb-8">
        <div className="flex items-center mb-6">
          <Search size={24} className="text-[#7E60BF] mr-3" />
          <h2 className="text-2xl font-bold text-[#E4B1F0]">
            Track Product
          </h2>
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

      {isDemoMode && (
        <Card className="mb-8 bg-[#433878] border-[#7E60BF]">
          <div className="flex items-center space-x-3">
            <AlertCircle size={24} className="text-[#E4B1F0]" />
            <p className="text-[#E4B1F0] font-medium">
              This is demo data. Connect a wallet to view actual product information.
            </p>
          </div>
        </Card>
      )}

      {((isDemoMode && demoProduct) || (!isDemoMode && product)) && (
        <>
          <Card className="mb-8">
            <div className="flex items-center mb-6">
              <Package size={24} className="text-[#7E60BF] mr-3" />
              <h3 className="text-2xl font-semibold text-[#E4B1F0]">
                Product Details
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="ID" value={(isDemoMode ? demoProduct : product).product.id.toString()} />
              <DetailItem label="Name" value={(isDemoMode ? demoProduct : product).product.name} />
              <DetailItem
                label="Description"
                value={(isDemoMode ? demoProduct : product).product.description}
              />
              <DetailItem
                label="Price"
                value={`${ethers.formatEther((isDemoMode ? demoProduct : product).product.price)} INR`}
              />
              <DetailItem label="Status" value={statusString} />
            </div>
          </Card>

          <Card className="mb-8">
            <SupplyChainVisualization status={(isDemoMode ? demoProduct : product).product.status} />
          </Card>

          <Card>
            <TransactionHistory
              contract={contract}
              productId={(isDemoMode ? demoProduct : product).product.id.toString()}
              isDemoMode={isDemoMode}
            />
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
        customToast("Product updated successfully", "success");
        setIsEditing(false);
      },
      onError: (error) => {
        console.error("Error updating product:", error);
        customToast(`Error updating product: ${error.message}`, "error");
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
      <TransactionHistory
        contract={contract}
        productId={product.id.toString()}
      />
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

const TransactionHistory = ({ contract, productId = null, isDemoMode }) => {
  const {
    data: transactions = [], // Default to an empty array if undefined
    isLoading,
    error,
  } = useQuery(
    ["transactionHistory", contract?.address, productId],
    async () => {
      if (!contract) throw new Error("Contract not initialized");

      const transactionFilter =
        contract.filters.TransactionPerformed(productId);
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
        if (
          !transactionMap.has(tx.transactionHash) ||
          Number(tx.timestamp) >
            Number(transactionMap.get(tx.transactionHash).timestamp)
        ) {
          transactionMap.set(tx.transactionHash, tx);
        }
      }

      const uniqueTransactions = Array.from(transactionMap.values());
      return uniqueTransactions.sort(
        (a, b) => Number(b.timestamp) - Number(a.timestamp)
      );
    },
    {
      enabled: !!contract,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const demoTransactions = [
    {
      productId: "1",
      action: "Product Created",
      performer: "Manufacturer",
      timestamp: (Date.now() / 1000 - 86400).toString(),
      transactionHash: "0x123...abc",
    },
    {
      productId: "1",
      action: "Sent by Manufacturer",
      performer: "Manufacturer",
      timestamp: (Date.now() / 1000 - 43200).toString(),
      transactionHash: "0x456...def",
    },
    {
      productId: "1",
      action: "Received by Distributor",
      performer: "Distributor",
      timestamp: Date.now().toString(),
      transactionHash: "0x789...ghi",
    },
  ];

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
      {isDemoMode && (
        <div className="p-4 bg-[#433878] text-[#E4B1F0] text-sm">
          Demo Mode: Showing sample transaction data. Connect a wallet to view actual transactions.
        </div>
      )}
      <div className="divide-y divide-[#433878]">
        {(isDemoMode ? demoTransactions : transactions).map((tx) => (
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
            {isDemoMode && <p className="text-xs text-gray-400 mt-2">Demo Data</p>}
          </div>
        ))}
      </div>
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

const DemoModeToggle = ({ isDemoMode, setIsDemoMode }) => {
  return (
    <div className="fixed bottom-4 right-4 flex items-center bg-gray-800 rounded-full p-2 shadow-lg">
      <button
        onClick={() => setIsDemoMode(!isDemoMode)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#7E60BF] focus:ring-offset-2 focus:ring-offset-gray-800 ${
          isDemoMode ? 'bg-[#7E60BF]' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isDemoMode ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="ml-2 text-sm font-medium text-white">Demo Mode</span>
    </div>
  );
};

export {
  Manufacturer,
  Distributor,
  Retailer,
  ProductTrackingPage,
  TransactionHistory,
  SupplyChainVisualization,
  ProductDetails,
  customToast,
};

const AppWrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          limit={3}
        />
        <App />
      </Provider>
    </QueryClientProvider>
  );
};

export default AppWrapper;
