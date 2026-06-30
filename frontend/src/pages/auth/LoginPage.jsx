import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Eye, EyeOff, Lock, User, Hash, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Toast from '../../components/common/Toast';


const LoginPage = () => {
  const { role } = useParams(); // Gets 'student', 'teacher', or 'admin' from URL
  const navigate = useNavigate();
  const { login } = useAuth();
  
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Role-Specific Configurations
  const roleConfig = {
    student: {
      title: "Student Login",
      identifierLabel: "Admission No.",
      identifierKey: "UID",
      placeholder: "e.g. SPP2025001",
      icon: Hash,
      inputMode: "text",
      apiPath: "/auth/student-login"
    },
    teacher: {
      title: "Teacher Login",
      identifierLabel: "Employee Code",
      identifierKey: "employeeCode",
      placeholder: "e.g. TCH102",
      icon: User,
      inputMode: "text",
      apiPath: "/auth/teacher-login"
    },
    admin: {
      title: "Admin Login",
      identifierLabel: "Email or Username",
      identifierKey: "email",
      placeholder: "admin@spps.com",
      icon: Mail,
      inputMode: "email",
      apiPath: "/auth/admin-login"
    }
  };

  const config = roleConfig[role] || roleConfig.student;

  const { register, handleSubmit, formState: { errors } } = useForm();

  // 2. Submission Logic
  const onSubmit = async (data) => {
  setIsLoading(true);
  setError(null);

  try {
    // A. Send the request to your Node.js backend
    const response = await API.post(config.apiPath, data);

    // B. Destructure the response
    // We separate the 'token' string from the rest of the 'userData'
    const { token, ...userData } = response.data;

    // C. The Handshake
    // We pass the clean userData (name, role, id) and the token string
    // to our Global Auth Context
    login(userData, token);

    // Note: The redirection logic happens inside AuthContext.login() 
    // which we implemented in Step 1.

  } catch (err) {
    // D. Error Capture
    // This pulls the "Invalid email or password" or "Account not active" 
    // messages you wrote in your Node.js controllers.
    const message = err.response?.data?.message || "Login failed. Please try again.";
    setError(message);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-white md:bg-background flex items-center justify-center p-4">
      
      {/* Toast for Errors */}
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}

      <div className="w-full max-w-md bg-white rounded-3xl md:shadow-2xl md:border border-gray-100 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-8 pb-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors text-secondary mb-6"
          >
            <ArrowLeft size={24} />
          </button>
          
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
            {config.title}
          </h1>
          <p className="text-secondary text-sm">
            Enter your credentials to access your dashboard.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 pt-4 space-y-5">
          
          <Input
            label={config.identifierLabel}
            icon={config.icon}
            placeholder={config.placeholder}
            inputMode={config.inputMode}
            {...register(config.identifierKey, { 
              required: `${config.identifierLabel} is required` 
            })}
            error={errors[config.identifierKey]?.message}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              placeholder="••••••••"
              {...register("password", { 
                required: "Password is required",
                minLength: { value: 6, message: "Minimum 6 characters" }
              })}
              error={errors.password?.message}
            />
            {/* Show/Hide Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[42px] text-gray-400 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="pt-2">
          <Button 
            type="submit" 
            fullWidth 
            isLoading={isLoading}
            variant="primary"
          >
            Login to System
          </Button>
          </div>

          <div className="text-center pt-4">
            <button 
              type="button"
              className="text-sm font-bold text-secondary hover:text-primary transition-colors"
              onClick={() => alert("Please contact the school office to reset your password.")}
            >
              Forgot Password?
            </button>
          </div>
          {role === 'student' && (
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-secondary">
                Contact school office for new admission.
              </p>
            </div>
          )}
        </form>

        <div className="p-8 pt-0 pb-10 text-center">
          <p className="text-xs text-gray-400 font-medium">
            Protected by SPPS Security System
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;