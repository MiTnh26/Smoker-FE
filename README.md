Smoker-FE (React)

Project Structure

```
Smoker-FE/
├─ package.json
├─ package-lock.json
├─ public/
│  ├─ index.html
│  ├─ manifest.json
│  └─ ...
└─ src/
   ├─ api/
   │  ├─ axiosClient.js     # Axios instance with baseURL + token interceptor
   │  ├─ userApi.js         # /user endpoints (me, updateProfile)
   │  ├─ businessApi.js     # business endpoints
   │  └─ performerApi.js    # performer endpoints
   ├─ components/
   │  ├─ common/            # Reusable UI primitives (Button, Input, ...)
   │  └─ layout/            # Layout pieces (Navbar, Sidebar, ...)
   ├─ config/               # FE configs (routes, roles, constants)
   ├─ contexts/
   │  └─ AuthContext.js     # Global auth state
   ├─ hooks/                # Reusable hooks (useAuth, useFetch, ...)
   ├─ layouts/              # Page layouts per role (AdminLayout, ...)
   ├─ modules/              # Feature modules grouped by domain
   │  ├─ auth/
   │  ├─ business/
   │  ├─ customer/
   │  │  └─ pages/
   │  │     └─ ProfileSetup.js  # Supports file upload via FormData
   │  ├─ dancer/
   │  ├─ dj/
   │  └─ landing/
   ├─ routes/               # Route definitions and guards
   ├─ store/                # Redux store (if used)
   ├─ styles/               # Global and module styles
   ├─ utils/                # Utilities (formatters, validators)
   ├─ App.js
   └─ index.js
```

Environment (.env)

```
REACT_APP_API_URL=http://localhost:9999/api
```

Scripts

```
npm i
npm start
```

Notes
- Profile setup uses file inputs for avatar/background and sends multipart FormData to the backend.
- Axios interceptor automatically includes Authorization header from localStorage token.
