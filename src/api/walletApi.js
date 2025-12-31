import axiosClient from './axiosClient';

export const walletApi = {
  getWallet: () => axiosClient.get('/wallet'),
  getTransactions: (params) => axiosClient.get('/wallet/transactions', { params }),
  createWithdrawRequest: (amount, bankInfoId, pin) => 
    axiosClient.post('/wallet/withdraw', { amount, bankInfoId, pin }),
  getWithdrawRequests: (params) => 
    axiosClient.get('/wallet/withdraw-requests', { params }),
  setPin: (pin) => 
    axiosClient.post('/wallet/set-pin', { pin }),
  verifyPin: (pin) => 
    axiosClient.post('/wallet/verify-pin', { pin })
};

