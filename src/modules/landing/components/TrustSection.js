import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Award, Users, Clock } from "lucide-react";
import { cn } from "../../../utils/cn";

// Simulated real-time booking counter
const useBookingCounter = () => {
  const [count, setCount] = useState(10247);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 3));
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return count;
};

const trustFeatures = [
  {
    icon: Shield,
    title: "Bảo mật 100%",
    description: "Thông tin được mã hóa an toàn",
    color: "from-green-400 to-emerald-500",
  },
  {
    icon: Award,
    title: "Nội dung chất lượng",
    description: "Nội dung được kiểm duyệt và đảm bảo",
    color: "from-yellow-400 to-orange-500",
  },
  {
    icon: Users,
    title: "10K+ Khách hàng",
    description: "Tin tưởng và sử dụng dịch vụ",
    color: "from-blue-400 to-indigo-500",
  },
  {
    icon: Clock,
    title: "Tốc độ nhanh",
    description: "Tải và chia sẻ nội dung trong vài giây",
    color: "from-purple-400 to-pink-500",
  },
];

export function TrustSection() {
  const bookingCount = useBookingCounter();

  return (
    <section className={cn("py-10 md:py-12 px-4 bg-gradient-to-br from-background via-primary/5 to-background relative overflow-hidden")}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-secondary rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Real-time Booking Counter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 md:mb-10"
        >
          <motion.div
            className={cn(
              "inline-flex items-center gap-3 px-6 py-4 rounded-2xl",
              "bg-card/80 backdrop-blur-sm border border-primary/20",
              "shadow-lg"
            )}
          >
            <Clock className="w-6 h-6 text-primary animate-pulse" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Người dùng hoạt động trong 24h qua</p>
              <motion.p
                key={bookingCount}
                initial={{ scale: 1.2, color: "#0ea5e9" }}
                animate={{ scale: 1, color: "inherit" }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "text-2xl md:text-3xl font-bold",
                  "text-primary"
                )}
              >
                {bookingCount.toLocaleString("vi-VN")}+
              </motion.p>
            </div>
          </motion.div>
        </motion.div>

        {/* Trust Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
        >
          {trustFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={cn(
                "bg-card/60 backdrop-blur-sm rounded-xl p-4 md:p-5",
                "border border-border/50",
                "text-center",
                "hover:bg-card/80 hover:shadow-lg",
                "transition-all duration-300"
              )}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full mx-auto mb-3",
                  feature.color,
                  "flex items-center justify-center",
                  "shadow-lg"
                )}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-base mb-1.5 text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

