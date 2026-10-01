import React, { useState,useEffect, useRef} from 'react';
import { navbarStyles } from '../assets/frontend/dummyStyles';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {SignedIn, UserButton, SignedOut, useClerk} from '@clerk/clerk-react';
import { User } from 'lucide-react';
import { Key, Menu, X} from 'lucide-react';

const logo = "/favicon.svg";

const STORAGE_KEY = "doctorToken_v1";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const location = useLocation();
  const navRef = useRef(null);
  const clerk = useClerk();
  const navigate = useNavigate();

   useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setIsDoctorLoggedIn(Boolean(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

   const navItems = [
    { label: "Home", href: "/" },
    { label: "Doctors", href: "/doctors" },
    { label: "Services", href: "/services" },
    { label: "Appointments", href: "/appointments" },
    { label: "Contact", href: "/contact" },
  ];
  return (

    <>
    <div className={navbarStyles.navbarBorder}></div>
     
    <nav ref={navRef} className={`${navbarStyles.navbarContainer} ${navbarStyles.navbarVisible}`}>
      <div className={navbarStyles.contentWrapper}>
  <div className={navbarStyles.flexContainer}>
    
    {/* Logo */}
    <Link to="/" className={navbarStyles.logoLink}>
      <div className={navbarStyles.logoContainer}>
        <div className={navbarStyles.logoImageWrapper}>
          <img
            src={logo}
            alt="logo"
            className={navbarStyles.logoImage}
          />
        </div>
      </div>
      <div className={navbarStyles.logoTextContainer}>
  <h1 className={navbarStyles.logoTitle}>MediCare</h1>
  <p className={navbarStyles.logoSubtitle}>
    Healthcare Solutions
  </p>
</div>
    </Link>
    <div className={navbarStyles.desktopNav}>
  <div className={navbarStyles.navItemsContainer}>
    {navItems.map((item) => {
      const isActive = location.pathname === item.href;

      return (
        <Link
          key={item.href}
          to={item.href}
          className={`${navbarStyles.navItem} ${
            isActive
              ? navbarStyles.navItemActive
              : navbarStyles.navItemInactive
          }`}
        >
          {item.label}
        </Link>
      );
    })}
  </div>
</div>
{/* right side */}
<div className={navbarStyles.rightContainer}>
  <SignedOut>
    <Link
      to="/doctor-admin/login"
      className={navbarStyles.doctorAdminButton}
    >
      <User className={navbarStyles.doctorAdminIcon} />
      <span className ={navbarStyles.doctorAdminText}>
        Doctor Admin
      </span>
      
    </Link>
    {/* patient login */}
<button
  onClick={() => clerk.openSignIn()}
  className={navbarStyles.loginButton}
>
  <Key className={navbarStyles.loginIcon}/>
  Login
</button>
  </SignedOut>

  <SignedIn>
  <UserButton afterSignOutUrl="/" />
</SignedIn>

{/* to toggle */}
<button
  onClick={() => setIsOpen(!isOpen)}
  className={navbarStyles.mobileToggle}
>
  {isOpen ? (
    <X className={navbarStyles.toggleIcon} />
  ) : (
    <Menu className={navbarStyles.toggleIcon} />
  )}
</button>
</div>

  </div>
{/* mobile navigations */}
{isOpen && (
  <div className={navbarStyles.mobileMenu}>
    {navItems.map((item, idx) => {
      const isActive = location.pathname === item.href;

      return (
        <Link
          key={idx}
          to={item.href}
          className={`${navbarStyles.mobileMenuItem} ${isActive ? navbarStyles.mobileMenuItemActive : navbarStyles.mobileMenuItemInactive}`}
          onClick={() => setIsOpen(false)}
        >
          {item.label}
        </Link>
      );
    })}

    <SignedOut>
  <Link
    to="/doctor-admin/login"
    className={navbarStyles.mobileDoctorAdminButton}
    onClick={() => setIsOpen(false)}
  >
    Doctor Admin
  </Link>

  <div className={navbarStyles.mobileLoginContainer}>
    <button
      onClick={() => {
        setIsOpen(false);
        clerk.openSignIn();
      }}
      className={navbarStyles.mobileLoginButton}
    >
      Login
    </button>
  </div>
</SignedOut>
  </div>
)}


</div>
 <style>{navbarStyles.animationStyles}</style>
    </nav>
</>
  )
}

export default Navbar
