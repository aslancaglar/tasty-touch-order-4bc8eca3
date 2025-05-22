
# Qimbo Kiosk - Restaurant Self Order Kiosk System

## Project Overview
Qimbo Kiosk is a comprehensive Point of Sale (POS) system designed for modern restaurants, featuring both customer-facing self-service ordering and administrative management capabilities. The platform enables smooth ordering experiences while providing restaurant owners and staff with powerful management tools.

## Technology Stack
- **Frontend**: React + TypeScript with Vite build system
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API and TanStack Query
- **Backend**: Supabase (PostgreSQL database, authentication, storage)
- **Printing**: Browser-based thermal receipt printing system

## Key Features

### Customer-Facing Kiosk Mode
- **Intuitive Ordering Flow**: Guided process from welcome screen to order confirmation
- **Order Type Selection**: Choose between dine-in or takeaway
- **Table Selection**: For dine-in orders with configurable table numbers
- **Menu Browsing**: Visual category and item navigation with high-quality images
- **Item Customization**: Add toppings, select options, modify quantities
- **Cart Management**: Real-time updates, item removal, quantity adjustments
- **Multi-language Support**: Configurable UI language (English, French, Turkish)
- **Currency Customization**: Configure currency display based on region
- **Offline Support**: Basic functionality when internet connection is lost
- **Receipt Printing**: Automatic thermal receipt generation on order completion
- **Inactivity Detection**: Automatic reset after period of no interaction

### Administrative Dashboard
- **Restaurant Management**: Setup and configuration of restaurant details
- **Menu Administration**: CRUD operations for categories, items, options, and toppings
- **Order Tracking**: Real-time order status monitoring and management
- **Sales Analytics**: Performance metrics and reporting tools
- **Stock Management**: Inventory tracking and low-stock alerts
- **Settings**: Configure kiosk behavior, printers, and payment options
- **Role-Based Access**: Separate admin and owner permission levels
- **Multi-restaurant Support**: Manage multiple restaurant locations

## System Architecture

### Frontend Structure
The application is organized into focused components:

- **Pages**: Top-level route components (`KioskView`, `Dashboard`, etc.)
- **Components**:
  - `kiosk/`: Customer-facing UI components
  - `restaurant/`: Admin dashboard components
  - `ui/`: Reusable UI components built on shadcn/ui
  - `forms/`: Form components for data entry
  - `layout/`: Page layout components
- **Hooks**: Custom React hooks for shared logic
- **Utils**: Utility functions including printing, caching, and data processing
- **Services**: API interaction and data management
- **Contexts**: Global state management

### Security Implementation
- **Authentication**: Supabase Auth with email/password login
- **Role-Based Access**: Admin and restaurant owner permission levels
- **Data Validation**: Input sanitization using DOMPurify
- **SQL Injection Prevention**: Parameterized queries and proper search path settings
- **Session Management**: Secure token handling and session expiry

## Data Models

### Core Entities
- **Restaurant**: Central entity storing location, settings, and configuration
- **Menu Categories**: Groups of similar menu items (e.g., Appetizers, Main Courses)
- **Menu Items**: Individual food/drink products with prices and descriptions
- **Menu Item Options**: Customization options for menu items
- **Option Choices**: Specific choices within an option
- **Topping Categories**: Groups of related toppings (e.g., Sauces, Extras)
- **Toppings**: Individual add-ons with prices
- **Orders**: Customer orders with status tracking
- **Order Items**: Individual items within an order
- **Users & Profiles**: Admin and owner account management

### Relationships
- Restaurants have multiple menu categories
- Menu categories contain multiple menu items
- Menu items can have multiple options and topping categories
- Orders contain multiple order items
- Order items can have selected options and toppings

## Performance Optimizations
- **Data Preloading**: Essential data is preloaded during kiosk initialization
- **Image Caching**: Menu images are cached for improved loading speed
- **Offline Support**: Service worker implementation for basic offline functionality
- **Lazy Loading**: Components are loaded on demand to reduce initial load time
- **Debounced Printing**: Prevents accidental double-printing of receipts

## Receipt Printing System
The application implements a specialized receipt printing system designed for thermal printers:

- **Implementation**: Uses an iframe-based approach to avoid extra popups
- **ESC/POS Commands**: Text formatting and paper cutting for thermal printers
- **Custom Styling**: Optimized CSS for 80mm receipt paper
- **Content Structure**: Clearly organized order information with restaurant branding
- **Cross-browser Support**: Compatible with major browsers' print functionality
- **Offline Detection**: Prevents printing attempts when offline

## Development Guide

### Prerequisites
- Node.js 16+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Supabase account (for backend services)

### Setup
```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd qimbo-kiosk

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Development Guidelines

1. **Component Organization**:
   - Create dedicated files for new components
   - Keep components small and focused (< 50 lines when possible)
   - Follow the established folder structure

2. **Styling**:
   - Use Tailwind CSS classes consistently
   - Follow the shadcn/ui design patterns

3. **TypeScript**:
   - Maintain strong typing throughout the codebase
   - Reference types in `src/types/database-types.ts`

4. **Testing**:
   - Test all changes in both kiosk and admin modes
   - Verify receipt printing functionality when making relevant changes
   - Test offline functionality and recovery

## Deployment & Hosting
- Built-in Lovable publishing system
- Custom domain support through Lovable's domain management
- Environment configuration for production settings

## Customization Options
- Restaurant details and branding
- Menu structure and pricing
- Receipt layout and content
- UI language preferences
- Currency display format
- Kiosk behavior settings

## Security Recommendations
- Regularly update dependencies
- Implement proper search path settings for Supabase functions
- Review and enforce Row Level Security policies
- Sanitize all user inputs
- Use HTTPS for all communications
- Implement regular database backups

## Future Roadmap
- Payment gateway integration
- Customer loyalty system
- Mobile ordering app integration
- Kitchen display system
- Advanced inventory management
- Enhanced analytics and reporting
- Staff scheduling and management

## Support & Maintenance
The system is designed for ease of maintenance with:
- Modular component architecture
- Comprehensive error logging
- Clear separation of concerns
- Detailed documentation

---

This project is maintained and improved regularly. For questions or support, please contact the development team.
