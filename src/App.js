import React from "react";

const APP_ID = "2136421337180240423"; // thay bằng của bạn
const REDIRECT_URI = "http://localhost:4000/auth/zalo/callback";

function App() {
  const handleZaloLogin = () => {
    const zaloAuthUrl = `https://oauth.zaloapp.com/v4/permission?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&state=random_state_string`;

    console.log("ZALO LOGIN URL:", zaloAuthUrl);
    window.location.href = zaloAuthUrl;
  };

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h1>Đăng nhập bằng Zalo Demo</h1>
      <button
        onClick={handleZaloLogin}
        style={{
          background: "#0068FF",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Đăng nhập với Zalo
      </button>
    </div>
  );
}

export default App;
