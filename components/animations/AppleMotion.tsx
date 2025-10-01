import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useScrollTrigger } from '../../hooks/useScrollTrigger';
import { 
  fadeInUp, 
  fadeInLeft, 
  fadeInRight, 
  scaleIn,
  staggerContainer,
  staggerItem,
  hoverScale,
  hoverLift,
  tapScale,
  appleEasing,
  appleDuration
} from '../../utils/animation';

// Base motion component with Apple-style animations
interface AppleMotionProps extends HTMLMotionProps<'div'> {
  animation?: 'fadeInUp' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn';
  trigger?: boolean;
  delay?: number;
  children: React.ReactNode;
}

export function AppleMotion({ 
  animation = 'fadeInUp', 
  trigger = true, 
  delay = 0,
  children, 
  ...props 
}: AppleMotionProps) {
  const { ref, isInView } = useScrollTrigger(0.1);

  const animations = {
    fadeInUp,
    fadeInLeft,
    fadeInRight,
    scaleIn,
  };

  const selectedAnimation = animations[animation];

  return (
    <motion.div
      ref={ref}
      initial={selectedAnimation.initial}
      animate={trigger && isInView ? selectedAnimation.animate : selectedAnimation.initial}
      exit={selectedAnimation.exit}
      style={{
        ...selectedAnimation.animate.transition,
        transitionDelay: `${delay}s`,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Stagger container for multiple animated elements
interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  staggerDelay?: number;
  childDelay?: number;
}

export function StaggerContainer({ 
  children, 
  staggerDelay = 0.1, 
  childDelay = 0.2,
  ...props 
}: StaggerContainerProps) {
  const { ref, isInView } = useScrollTrigger(0.1);

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={isInView ? "animate" : "initial"}
      variants={{
        ...staggerContainer,
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: childDelay,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Stagger item component
interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

export function StaggerItem({ children, ...props }: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Interactive button with Apple-style hover and tap animations
interface AppleButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AppleButton({ 
  children, 
  variant = 'primary',
  size = 'md',
  className = '',
  ...props 
}: AppleButtonProps) {
  const baseClasses = 'relative inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40',
    secondary: 'bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200',
    ghost: 'text-gray-700 hover:bg-gray-100',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      whileHover={hoverScale}
      whileTap={tapScale}
      transition={{
        duration: appleDuration.fast,
        ease: appleEasing.natural,
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Card component with Apple-style hover effects
interface AppleCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}

export function AppleCard({ 
  children, 
  hover = true,
  className = '',
  ...props 
}: AppleCardProps) {
  const baseClasses = 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden';

  return (
    <motion.div
      className={`${baseClasses} ${className}`}
      whileHover={hover ? hoverLift : undefined}
      transition={{
        duration: appleDuration.fast,
        ease: appleEasing.natural,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Hero section with layered animations
interface AppleHeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  children?: React.ReactNode;
  backgroundImage?: string;
}

export function AppleHero({ 
  title, 
  subtitle, 
  description, 
  children,
  backgroundImage 
}: AppleHeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      {backgroundImage && (
        <motion.div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: appleDuration.slowest, ease: appleEasing.easeOut }}
        />
      )}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-white/95 to-indigo-50/90 z-10" />
      
      {/* Content */}
      <div className="relative z-20 text-center max-w-4xl mx-auto px-6">
        <StaggerContainer>
          {subtitle && (
            <StaggerItem>
              <motion.p className="text-blue-600 font-medium text-lg mb-4">
                {subtitle}
              </motion.p>
            </StaggerItem>
          )}
          
          <StaggerItem>
            <motion.h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-6 leading-tight">
              {title}
            </motion.h1>
          </StaggerItem>
          
          {description && (
            <StaggerItem>
              <motion.p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                {description}
              </motion.p>
            </StaggerItem>
          )}
          
          {children && (
            <StaggerItem>
              <motion.div className="flex flex-col sm:flex-row gap-4 justify-center">
                {children}
              </motion.div>
            </StaggerItem>
          )}
        </StaggerContainer>
      </div>
    </section>
  );
}

// Floating element with subtle parallax
interface FloatingElementProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  speed?: number;
}

export function FloatingElement({ 
  children, 
  speed = 50,
  ...props 
}: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [-10, 10, -10],
        rotate: [-1, 1, -1],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: appleEasing.natural,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}