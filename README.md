Smoker-FE (React)

Structure:
- src/
  - api/
    - axiosClient.js (baseURL + token interceptor)
    - userApi.js (auth + user API wrappers)
  - contexts/
    - AuthContext.js (store token+user)
  - hooks/
    - useAuth.js
  - routes/
    - AppRoutes.js (route map)
    - ProtectedRoute.js (guard)
  - modules/
    - auth/pages/
      - Login.js (email/password login + button to Google login page)
      - Register.js (manual register + button Google register)
      - GoogleLogin.js (email prompt to initiate Google auth flow)
    - customer/pages/
      - ProfileSetup.js (complete profile)
      - Profile.js (view/update profile)
    - landing/pages/
      - Home.js

Env:
REACT_APP_API_URL=http://localhost:9999/api

Scripts:
1) npm i
2) npm start
