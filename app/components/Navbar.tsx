interface NavbarProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export default function Navbar({ isLoggedIn, onLoginClick, onLogoutClick }: NavbarProps) {
  return (
    <nav className="w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <h1 className="text-xl font-semibold text-gray-800">PersonalizedChatbot</h1>
      </div>
      <div className="flex items-center space-x-4">
        {isLoggedIn ? (
          <button
            onClick={onLogoutClick}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}