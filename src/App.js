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
  Settings,
  LogOut,
  Edit,
  Circle,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClientProvider,
  QueryClient,
} from "react-query";
import "./index.css";
import abi from "./SupplyChainManagement.json";
import { debounce } from "lodash";

// Set up contract details
const CONTRACT_ADDRESS = "0xe6b98F104c1BEf218F3893ADab4160Dc73Eb8367"; // Change to your deployed contract address

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
        const signer = await provider.getSigner();
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          abi.abi,
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
    className={`w-full px-4 py-2 bg-white bg-opacity-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200 placeholder-gray-400 backdrop-filter backdrop-blur-sm ${className}`}
    {...props}
  />
);

const Button = ({ children, className = "", disabled, ...props }) => (
  <button
    className={`bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition duration-300 flex items-center justify-center shadow-lg ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
    } ${className}`}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl ${className}`}
  >
    {children}
  </div>
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
          Price (ETH)
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
        <div className="min-h-screen bg-gray-100 text-gray-900">
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
                    component={TransactionHistory}
                    contract={contract}
                    requiredAddress={Object.values(roles)}
                    account={account}
                  />
                }
              />
            </Routes>
          </main>
        </div>
        <ToastContainer position="bottom-right" autoClose={5000} />
      </Router>
    </Provider>
  );
};

const Navbar = ({ account, hasRole, getUserRole }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-800">ChainFlow</span>
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
              <div className="text-sm font-medium text-gray-500">
                {getUserRole()}: {account.slice(0, 6)}...{account.slice(-4)}
              </div>
            ) : (
              <Button onClick={() => {}}>Connect Wallet</Button>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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

      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <NavLink to="/">Home</NavLink>
            {hasRole() && (
              <>
                <NavLink to="/track">Track Product</NavLink>
                <NavLink to="/history">Transaction History</NavLink>
              </>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <User className="h-10 w-10 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {getUserRole()}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {account
                    ? `${account.slice(0, 6)}...${account.slice(-4)}`
                    : "Not connected"}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                onClick={() => {}}
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full text-left"
              >
                <Settings className="inline-block h-5 w-5 mr-2" />
                Settings
              </button>
              <button
                onClick={() => {}}
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full text-left"
              >
                <LogOut className="inline-block h-5 w-5 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLink = ({ to, children }) => (
  <Link
    to={to}
    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition duration-300"
  >
    {children}
  </Link>
);

const useProductTracking = (contract) => {
  const fetchProduct = useCallback(
    async (productId) => {
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
    },
    [contract]
  );

  return { fetchProduct };
};

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
    <div className="bg-white shadow-lg rounded-lg p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Supply Chain Management System
      </h1>
      <p className="text-gray-600 mb-4">
        Welcome to our blockchain-based supply chain management system. Select
        your role to access the appropriate dashboard.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {roleCards.map((role) => (
          <RoleCard
            key={role.title}
            title={role.title}
            icon={role.icon}
            path={role.path}
            isActive={
              account &&
              role.address &&
              account.toLowerCase() === role.address.toLowerCase()
            }
          />
        ))}
      </div>
    </div>
  );
};

const RoleCard = ({ title, icon: Icon, path, isActive }) => (
  <Link
    to={path}
    className={`block p-6 bg-white border rounded-lg shadow hover:bg-gray-50 transition-colors duration-200 ${
      isActive ? "border-blue-500" : "border-gray-200"
    }`}
  >
    <div className="flex items-center space-x-4">
      <Icon
        size={24}
        className={isActive ? "text-blue-500" : "text-gray-500"}
      />
      <h2
        className={`text-xl font-semibold ${
          isActive ? "text-blue-600" : "text-gray-700"
        }`}
      >
        {title}
      </h2>
    </div>
    <p
      className={`mt-2 text-sm ${isActive ? "text-blue-600" : "text-gray-500"}`}
    >
      {isActive ? "Access Granted" : "Access Restricted"}
    </p>
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
  const [pendingReturns, setPendingReturns] = useState([]);

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

  const fetchPendingReturns = useCallback(async () => {
    if (!contract) return;
    try {
      const returns = await contract.getPendingReturnRequests();
      setPendingReturns(returns);
    } catch (error) {
      console.error("Failed to fetch pending returns:", error);
      toast.error("Unable to load pending returns. Please try again later.");
    }
  }, [contract]);

  useEffect(() => {
    fetchPendingReturns();
  }, [fetchPendingReturns]);

  const processReturnMutation = useMutation(
    async ({ returnRequestId, approved }) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.processReturn(returnRequestId, approved);
      await tx.wait();
    },
    {
      onSuccess: (_, { returnRequestId, approved }) => {
        setPendingReturns((prevReturns) =>
          prevReturns.filter((r) => r.id.toString() !== returnRequestId.toString())
        );
        toast.success(`Return request ${approved ? 'approved' : 'rejected'}`);
        fetchPendingReturns();
        // Invalidate queries to refresh product lists
        queryClient.invalidateQueries("manufacturerProducts");
        queryClient.invalidateQueries("receivableProducts");
        queryClient.invalidateQueries("receivedProducts");
        queryClient.invalidateQueries("retailerProducts");
      },
      onError: (error) => {
        console.error("Error processing return:", error);
        toast.error(`Error processing return: ${error.message}`);
      },
    }
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Owner Dashboard</h2>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-semibold mb-4">
          Set Supply Chain Addresses
        </h3>
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
          <Button onClick={setAddresses} disabled={isLoading}>
            {isLoading ? "Processing..." : "Set Addresses"}
          </Button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-semibold mb-4">Filter Products by Date</h3>
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
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Manage Products</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id.toString()}
              className="bg-gray-50 rounded-lg p-4 shadow"
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
                  <h4 className="font-semibold">
                    Product {product.id.toString()}
                  </h4>
                  <p>Name: {product.name}</p>
                  <p>Description: {product.description}</p>
                  <p>Price: {ethers.formatEther(product.price)} ETH</p>
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
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Pending Return Requests</h3>
        {pendingReturns.length === 0 ? (
          <p>No pending return requests.</p>
        ) : (
          <div className="space-y-4">
            {pendingReturns.map((request) => (
              <div
                key={request.id.toString()}
                className="border p-4 rounded-lg"
              >
                <p>Return Request ID: {request.id.toString()}</p>
                <p>Product ID: {request.productId.toString()}</p>
                <p>Requester: {request.requester}</p>
                <p>Reason: {request.reason}</p>
                <div className="mt-2 space-x-2">
                  <Button
                    onClick={() =>
                      processReturnMutation.mutate({
                        returnRequestId: request.id,
                        approved: true,
                      })
                    }
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() =>
                      processReturnMutation.mutate({
                        returnRequestId: request.id,
                        approved: false,
                      })
                    }
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

const ReturnProductModal = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(reason);
    setReason("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Request Return</h3>
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full p-2 border rounded mb-4"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for return"
            required
          />
          <div className="flex justify-end space-x-2">
            <Button
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-black"
            >
              Cancel
            </Button>
            <Button type="submit">Submit Return Request</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductCard = ({ product, onSend, onReturn }) => {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  return (
    <div className="border p-4 rounded-lg">
      <p className="font-semibold">Product ID: {product.id}</p>
      <p>Name: {product.name}</p>
      <p>Price: {ethers.formatEther(product.price)} ETH</p>
      <div className="mt-4 space-x-2">
        {onSend && (
          <Button onClick={() => onSend(product.id)}>Send Product</Button>
        )}
        <Button
          onClick={() => setIsReturnModalOpen(true)}
          className="bg-yellow-500 hover:bg-yellow-600"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Return
        </Button>
      </div>
      <ReturnProductModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onSubmit={(reason) => onReturn(product.id, reason)}
      />
    </div>
  );
};

const Manufacturer = ({ contract }) => {
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
    ["manufacturerProducts"],
    async () => {
      if (!contract) throw new Error("Contract not initialized");
      const productsData = await contract.getProductsCreated();
      return productsData.map((product) => ({
        ...product,
        id: product.id.toString(),
        price: product.price.toString(),
        status: product.status,
      }));
    },
    {
      enabled: !!contract,
      refetchInterval: 5000,
    }
  );

  const createProductMutation = useMutation(
    async ({ name, description, price }) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.createProduct(
        name,
        description,
        ethers.parseEther(price)
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event) => event && event.name === "ProductCreated");

      if (!event) throw new Error("Product creation event not found");

      return {
        id: event.args.productId.toString(),
        name,
        description,
        price: ethers.parseEther(price),
      };
    },
    {
      onSuccess: (newProduct) => {
        queryClient.setQueryData(["manufacturerProducts"], (oldData) => {
          return oldData ? [...oldData, newProduct] : [newProduct];
        });
        toast.success("Product created successfully!");
        setNewProduct({ name: "", description: "", price: "" });
      },
      onError: (error) => {
        console.error("Error creating product:", error);
        toast.error(`Error creating product: ${error.message}`);
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
        queryClient.setQueryData(["manufacturerProducts"], (oldData) => {
          return oldData
            ? oldData.filter(
                (product) => product.id.toString() !== productId.toString()
              )
            : [];
        });
        toast.success(`Product ${productId} sent successfully!`);
      },
      onError: (error) => {
        console.error("Error sending product:", error);
        toast.error(`Error sending product: ${error.message}`);
      },
    }
  );

  const returnProductMutation = useMutation(
    async ({ productId, reason }) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.requestReturn(productId, reason);
      await tx.wait();
    },
    {
      onSuccess: (_, { productId }) => {
        queryClient.setQueryData(["manufacturerProducts"], (oldData) => {
          return oldData ? oldData.map(product => 
            product.id === productId 
              ? { ...product, status: 5 } // 5 represents ReturnRequested status
              : product
          ) : [];
        });
        toast.success(`Return request submitted for product ${productId}`);
      },
      onError: (error) => {
        console.error("Error requesting return:", error);
        toast.error(`Error requesting return: ${error.message}`);
      },
    }
  );

  const handleCreateProduct = useCallback(
    (e) => {
      e.preventDefault();
      if (
        !newProduct.name.trim() ||
        !newProduct.description.trim() ||
        !newProduct.price.trim()
      ) {
        toast.error("Please fill in all fields");
        return;
      }
      if (isNaN(newProduct.price) || parseFloat(newProduct.price) <= 0) {
        toast.error("Please enter a valid price");
        return;
      }
      createProductMutation.mutate(newProduct);
    },
    [newProduct, createProductMutation]
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({ ...prev, [name]: value }));
  };

  const handleReturnProduct = (productId, reason) => {
    returnProductMutation.mutate({ productId, reason });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-6">Manufacturer Dashboard</h2>

      <form onSubmit={handleCreateProduct} className="space-y-4">
        <input
          type="text"
          name="name"
          value={newProduct.name}
          onChange={handleInputChange}
          placeholder="Product Name"
          className="w-full px-4 py-2 border rounded-md"
        />
        <textarea
          name="description"
          value={newProduct.description}
          onChange={handleInputChange}
          placeholder="Product Description"
          className="w-full px-4 py-2 border rounded-md"
        />
        <input
          type="number"
          name="price"
          value={newProduct.price}
          onChange={handleInputChange}
          placeholder="Price in ETH"
          step="0.01"
          className="w-full px-4 py-2 border rounded-md"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          disabled={createProductMutation.isLoading}
        >
          {createProductMutation.isLoading
            ? "Creating..."
            : "Create New Product"}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.filter(product => product.status !== 5).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSend={() => sendProductMutation.mutate(product.id)}
            onReturn={handleReturnProduct}
          />
        ))}
      </div>
    </div>
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
        price: ethers.formatEther(product.price),
        status: product.status,
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
        price: ethers.formatEther(product.price),
        status: product.status,
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

      const updatedProduct = await contract.getProduct(productId);
      return {
        ...updatedProduct,
        id: updatedProduct.id.toString(),
        price: ethers.formatEther(updatedProduct.price),
      };
    },
    {
      onSuccess: (updatedProduct, productId) => {
        queryClient.setQueryData(["receivableProducts"], (oldData) => {
          return oldData
            ? oldData.filter((product) => product.id !== productId.toString())
            : [];
        });

        queryClient.setQueryData(["receivedProducts"], (oldData) => {
          return oldData ? [...oldData, updatedProduct] : [updatedProduct];
        });

        toast.success(`Product ${productId} received successfully!`, {
          toastId: `product-received-${productId}`,
        });
      },
      onError: (error) => {
        console.error("Error receiving product:", error);
        toast.error(`Error receiving product: ${error.message}`, {
          toastId: "product-receive-error",
        });
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
        queryClient.setQueryData(["receivedProducts"], (oldData) => {
          return oldData
            ? oldData.filter((product) => product.id !== productId.toString())
            : [];
        });
        toast.success(`Product ${productId} sent successfully!`);
      },
      onError: (error) => {
        console.error("Error sending product:", error);
        toast.error(`Error sending product: ${error.message}`);
      },
    }
  );

  const returnProductMutation = useMutation(
    async ({ productId, reason }) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.requestReturn(productId, reason);
      await tx.wait();
    },
    {
      onSuccess: (_, { productId }) => {
        queryClient.setQueryData(["receivableProducts", "receivedProducts"], (oldData) => {
          return oldData ? oldData.map(product => 
            product.id === productId 
              ? { ...product, status: 5 } // 5 represents ReturnRequested status
              : product
          ) : [];
        });
        toast.success(`Return request submitted for product ${productId}`);
      },
      onError: (error) => {
        console.error("Error requesting return:", error);
        toast.error(`Error requesting return: ${error.message}`);
      },
    }
  );

  const handleReturnProduct = (productId, reason) => {
    returnProductMutation.mutate({ productId, reason });
  };

  if (isLoadingReceivable || isLoadingReceived) return <div>Loading...</div>;

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Distributor Dashboard</h2>

      <h3 className="text-xl font-semibold mb-4">Receivable Products</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {receivableProducts?.filter(product => product.status !== 5).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onReceive={() => receiveProductMutation.mutate(product.id)}
            onReturn={handleReturnProduct}
          />
        ))}
      </div>

      <h3 className="text-xl font-semibold mb-4">Received Products</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {receivedProducts?.filter(product => product.status !== 5).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSend={() => sendProductMutation.mutate(product.id)}
            onReturn={handleReturnProduct}
          />
        ))}
      </div>
    </div>
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
        status: product.status,
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
        queryClient.setQueryData(["retailerProducts"], (oldData) => {
          return oldData
            ? oldData.filter((product) => product.id !== productId.toString())
            : [];
        });
        toast.success(`Product ${productId} received successfully!`, {
          toastId: `retailer-received-${productId}`,
        });
      },
      onError: (error) => {
        console.error("Error receiving product:", error);
        toast.error(`Error receiving product: ${error.message}`, {
          toastId: "retailer-receive-error",
        });
      },
    }
  );

  const returnProductMutation = useMutation(
    async ({ productId, reason }) => {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.requestReturn(productId, reason);
      await tx.wait();
    },
    {
      onSuccess: (_, { productId }) => {
        queryClient.setQueryData(["retailerProducts"], (oldData) => {
          return oldData ? oldData.map(product => 
            product.id === productId 
              ? { ...product, status: 5 } // 5 represents ReturnRequested status
              : product
          ) : [];
        });
        toast.success(`Return request submitted for product ${productId}`);
      },
      onError: (error) => {
        console.error("Error requesting return:", error);
        toast.error(`Error requesting return: ${error.message}`);
      },
    }
  );

  const handleReturnProduct = (productId, reason) => {
    returnProductMutation.mutate({ productId, reason });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Retailer Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.filter(product => product.status !== 5).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onReceive={() => receiveProductMutation.mutate(product.id)}
            onReturn={handleReturnProduct}
          />
        ))}
      </div>
    </div>
  );
};

const ProductTrackingPage = ({ contract, account, roles }) => {
  const [productId, setProductId] = useState("");
  const { fetchProduct } = useProductTracking(contract);
  const queryClient = useQueryClient();

  const {
    data: productData,
    isLoading,
    error,
    refetch,
  } = useQuery(["product", productId], () => fetchProduct(productId), {
    enabled: false,
    retry: false,
    onError: (err) => {
      if (err.message.includes("Invalid product ID")) {
        toast.error("Product not found. Please check the ID and try again.", {
          toastId: `product-not-found-${productId}`,
        });
      } else {
        toast.error("An error occurred while fetching the product.", {
          toastId: `product-fetch-error-${productId}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["product", productId]);
    },
  });

  const handleTrackProduct = useCallback(() => {
    if (!productId.trim() || isNaN(productId)) {
      toast.error("Please enter a valid product ID", {
        toastId: "invalid-product-id",
      });
      return;
    }
    refetch();
  }, [productId, refetch]);

  const debouncedRefetch = useMemo(
    () => debounce(() => refetch(), 300),
    [refetch]
  );

  const handleProductIdChange = useCallback(
    (e) => {
      setProductId(e.target.value);
      if (e.target.value.trim() && !isNaN(e.target.value)) {
        debouncedRefetch();
      }
    },
    [debouncedRefetch]
  );

  const statusString = useProductStatus(productData?.product?.status);

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
        <h2 className="text-3xl font-bold">Product Tracking</h2>
        <p className="mt-2 text-blue-100">
          Enter a product ID to track its journey through the supply chain
        </p>
      </div>
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Input
            type="number"
            value={productId}
            onChange={handleProductIdChange}
            placeholder="Enter Product ID"
            className="flex-grow"
          />
          <Button onClick={handleTrackProduct} disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Tracking...
              </span>
            ) : (
              <span className="flex items-center">
                <Search size={20} className="mr-2" />
                Track
              </span>
            )}
          </Button>
        </div>
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading product data...</p>
          </div>
        )}
        {error && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6"
            role="alert"
          >
            <p className="font-bold">Error</p>
            <p>{error.message}</p>
          </div>
        )}
        {!isLoading && !error && productData && (
          <ProductDetails
            product={productData.product}
            transactions={productData.transactions}
            history={productData.history}
            statusString={statusString}
            contract={contract}
            account={account}
            roles={roles}
          />
        )}
        {!isLoading && !error && !productData && (
          <div className="text-center py-8">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              No product data found. Try tracking a different product ID.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

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
          <h3 className="text-xl font-semibold text-gray-800">
            Product Details
          </h3>
          {!isEditing && isOwner && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center text-indigo-600 hover:text-indigo-900"
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
              value={`${ethers.formatEther(product.price)} ETH`}
            />
            <DetailItem label="Status" value={statusString} />
          </div>
        )}
      </Card>
      <SupplyChainVisualization status={product.status} />
      <TransactionHistory contract={contract} productId={product.id} />
    </>
  );
};

const DetailItem = ({ label, value }) => (
  <div>
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="mt-1 text-sm text-gray-900">{value}</p>
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
      <h3 className="text-xl font-semibold mb-4 text-gray-100">
        Supply Chain Progress
      </h3>
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.name}>
            <div
              className={`flex flex-col items-center ${
                index <= status ? "text-blue-400" : "text-gray-500"
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
                  index < status ? "bg-blue-400" : "bg-gray-600"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};

const TransactionHistory = ({ contract }) => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (!contract) {
        console.log("Contract is not available");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log("Fetching transaction history...");

        // Fetch all relevant events
        const createdFilter = contract.filters.ProductCreated();
        const sentFilter = contract.filters.ProductSent();
        const receivedFilter = contract.filters.ProductReceived();

        const [createdEvents, sentEvents, receivedEvents] = await Promise.all([
          contract.queryFilter(createdFilter),
          contract.queryFilter(sentFilter),
          contract.queryFilter(receivedFilter),
        ]);

        console.log("Created events:", createdEvents);
        console.log("Sent events:", sentEvents);
        console.log("Received events:", receivedEvents);

        // Process and combine all events
        const allTransactions = [
          ...createdEvents.map((event) => ({
            productId: event.args.productId.toString(),
            action: "Created",
            performer: event.args.manufacturer,
            timestamp: event.args.timestamp.toString(),
            transactionHash: event.transactionHash,
          })),
          ...sentEvents.map((event) => ({
            productId: event.args.productId.toString(),
            action: "Sent",
            from: event.args.from,
            to: event.args.to,
            timestamp: event.args.timestamp.toString(),
            transactionHash: event.transactionHash,
          })),
          ...receivedEvents.map((event) => ({
            productId: event.args.productId.toString(),
            action: "Received",
            performer: event.args.receiver,
            timestamp: event.args.timestamp.toString(),
            transactionHash: event.transactionHash,
          })),
        ];

        console.log("All transactions:", allTransactions);

        // Sort transactions by timestamp (most recent first)
        allTransactions.sort(
          (a, b) => Number(b.timestamp) - Number(a.timestamp)
        );

        setTransactions(allTransactions);
      } catch (error) {
        console.error("Error fetching transaction history:", error);
        toast.error("Failed to fetch transaction history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactionHistory();
  }, [contract]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Transaction History</h2>
      </div>
      {transactions.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p>No transactions recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {transactions.map((tx) => (
            <div
              key={tx.transactionHash}
              className="p-6 hover:bg-gray-50 transition duration-150 ease-in-out"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {tx.action === "Created" && (
                    <div className="bg-green-100 rounded-full p-2">
                      <Package className="text-green-500 h-6 w-6" />
                    </div>
                  )}
                  {tx.action === "Sent" && (
                    <div className="bg-blue-100 rounded-full p-2">
                      <Truck className="text-blue-500 h-6 w-6" />
                    </div>
                  )}
                  {tx.action === "Received" && (
                    <div className="bg-purple-100 rounded-full p-2">
                      <Store className="text-purple-500 h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-900">
                    Product {tx.productId} - {tx.action}
                  </p>
                  {tx.from && tx.to ? (
                    <p className="text-sm text-gray-500">
                      From: {tx.from.slice(0, 6)}...{tx.from.slice(-4)} To:{" "}
                      {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      By: {tx.performer.slice(0, 6)}...{tx.performer.slice(-4)}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(Number(tx.timestamp) * 1000).toLocaleString()}
                  </p>
                  <a
                    href={`https://etherscan.io/tx/${tx.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    View on Etherscan
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
          theme="light"
        />
        <App />
      </Provider>
    </QueryClientProvider>
  );
};

export default AppWrapper;
