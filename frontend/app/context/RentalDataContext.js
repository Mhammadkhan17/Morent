"use client";
import React, { createContext, useState, useContext } from "react";

// Create context
const RentalDataContext = createContext();

// Create a provider component
export const RentalDataProvider = ({ children }) => {
  const [billingInfo, setBillingInfo] = useState({
    name: "",
    address: "",
    phone: "",
    city: "",
  });

  const [rentalInfo, setRentalInfo] = useState({});

  // Store payment method as an object to avoid resets
  const [paymentMethod, setPaymentMethod] = useState({ method: "" });

  return (
    <RentalDataContext.Provider
      value={{
        billingInfo,
        setBillingInfo,
        rentalInfo,
        setRentalInfo,
        paymentMethod,
        setPaymentMethod,
      }}
    >
      {children}
    </RentalDataContext.Provider>
  );
};

// Custom hook to use context
export const useRentalData = () => {
  return useContext(RentalDataContext);
};
