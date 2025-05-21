
# Qimbo Kiosk - Restaurant Self Order Kiosk Web App
This is a modern Point of Sale (POS) system designed for restaurants, particularly focused on providing a smooth ordering experience for both customers and staff. The application includes both a kiosk view for customers to place orders and an admin dashboard for restaurant management.

## Project Overview

The application is built with:
- React + TypeScript
- Vite as the build tool
- Tailwind CSS for styling
- shadcn/ui component library
- Supabase for backend services and database

## Key Features

- **Kiosk Mode**: Self-service ordering interface for customers
- **Receipt Printing**: Support for thermal receipt printers (80mm)
- **Cart Management**: Add, remove, and adjust quantities of menu items
- **Order Management**: View and manage orders in the admin dashboard
- **Menu Management**: Add, edit, or remove menu items, categories, and toppings

## Application Structure

### Main Components

#### Kiosk Flow
- **Welcome Page**: Entry point for customers
- **Order Type Selection**: Choose between dine-in or takeaway
- **Table Selection**: For dine-in orders
- **Menu View**: Browse menu categories and items
- **Cart**: Review and modify selected items
- **Order Summary**: Finalize and confirm order
- **Order Receipt**: Print receipt with order details

#### Admin Dashboard
- **Menu Management**: CRUD operations for menu items and categories
- **Orders Management**: View and update order statuses
- **Settings**: Restaurant configuration

### Key Files and Their Purposes

- `src/components/kiosk/`: Contains all customer-facing components
  - `Cart.tsx`: Shopping cart functionality
  - `OrderSummary.tsx`: Order confirmation screen
  - `OrderReceipt.tsx`: Receipt template for printing
  - `CartButton.tsx`: Floating cart button
  - `OrderTypeSelection.tsx`: Dine-in/takeaway selection
  - `TableSelection.tsx`: Table number input
  - `WelcomePage.tsx`: Initial kiosk screen

- `src/components/ui/`: Reusable UI components based on shadcn/ui

- `src/utils/print-utils.ts`: Thermal printer integration logic

- `src/types/database-types.ts`: TypeScript interfaces for all data models

## Receipt Printing System

The application implements a receipt printing system optimized for 80mm thermal printers using a hidden iframe method to avoid extra popups:

1. **How it works**:
   - Receipt content is generated using the `OrderReceipt` component
   - The `printReceipt` function in `print-utils.ts` handles the actual printing
   - An invisible iframe is created with print-specific styling
   - Only the standard browser print dialog appears (no secondary windows)

2. **Print flow**:
   - When an order is placed, the receipt content is prepared but hidden
   - After order confirmation, the print function is triggered
   - The browser's print dialog appears for the user
   - After printing or cancellation, the iframe is automatically removed

## Data Models

The system uses the following key data models:

- **Restaurant**: Restaurant information
- **MenuCategory**: Categories of menu items (e.g., Appetizers, Main Courses)
- **MenuItem**: Individual food/drink items with prices
- **MenuItemOption**: Customization options for menu items
- **OptionChoice**: Specific choices for each option
- **ToppingCategory**: Groups of toppings that can be added
- **Topping**: Individual toppings with prices
- **Order**: Customer orders with status tracking
- **OrderItem**: Items in an order with quantities and prices
- **CartItem**: Temporary cart items with selected options and toppings

## Getting Started for Developers

### Prerequisites
- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Setup
```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd <project-directory>

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Development Guidelines

1. **Component Organization**:
   - Create new files for new components, rather than extending existing ones
   - Keep components small and focused (aim for less than 50 lines)
   - Use the established folder structure for new additions

2. **Styling**:
   - Use Tailwind CSS classes for styling
   - Follow the existing design system for consistency

3. **TypeScript**:
   - Use proper typing for all variables, functions, and components
   - Reference the type definitions in `src/types/database-types.ts`

4. **Testing Changes**:
   - Test all changes in kiosk mode to ensure proper functionality
   - Verify receipt printing works correctly when making changes to that system

## Main Challenges and Solutions

### Receipt Printing
The system uses an iframe-based approach to handle receipt printing without showing additional popups to users. This ensures a cleaner user experience while still using the browser's native print functionality.

### Cart Management
The cart system manages complex menu items with multiple options and toppings, calculating correct prices and maintaining state throughout the ordering process.

## Deployment

The project can be deployed using the Lovable platform's built-in publishing functionality. Click on "Share" and then "Publish" in the Lovable interface.

## Customization

The system is designed to be customizable:
- Restaurant details can be changed in the admin settings
- Menu items, categories, and pricing can be adjusted
- Receipt layout and styling can be modified in the `OrderReceipt.tsx` component and `print-utils.ts`

## Connecting a Custom Domain

The application can be connected to a custom domain through Lovable's domain management system. Navigate to Project > Settings > Domains in Lovable to set this up.
