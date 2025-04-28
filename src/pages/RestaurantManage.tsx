import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Edit, Plus, Trash2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { getIconComponent } from "@/utils/icon-mapping";
import { 
  getRestaurants, 
  getCategoriesByRestaurantId, 
  getMenuItemsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getToppingCategoriesByRestaurantId,
  getRestaurantById,
  updateRestaurant
} from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, ToppingCategory } from "@/types/database-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import CategoryForm from "@/components/forms/CategoryForm";
import MenuItemForm from "@/components/forms/MenuItemForm";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Order } from "@/types/database-types";
import { getOrdersByRestaurantId, updateOrderStatus } from "@/services/kiosk-service";
import { CheckCheck, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "@radix-ui/react-icons";
import { DateRange } from "react-day-picker";
import { Button as UIButton } from "@/components/ui/button";
import { Input as UInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import PrintNodeIntegration from "@/components/restaurant/PrintNodeIntegration";
import CacheManagement from "@/components/restaurant/CacheManagement";
import { useParams } from "react-router-dom";

interface OrdersTabProps {
  restaurantId: string;
}

const OrdersTab: React.FC<OrdersTabProps> = ({ restaurantId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<DateRange | undefined>(undefined)
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getOrdersByRestaurantId(restaurantId);
        setOrders(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast({
          title: "Error",
          description: "Failed to fetch orders. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchOrders();
  }, [restaurantId, toast]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setLoading(true);
      await updateOrderStatus(orderId, newStatus);
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      toast({
        title: "Order Status Updated",
        description: `Order status updated to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = selectedStatus
    ? orders.filter(order => order.status === selectedStatus)
    : orders;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Orders</h2>
        <div className="flex items-center space-x-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="bottom">
              <Calendar
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                pagedNavigation
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={open} className="w-[200px] justify-between">
                {selectedStatus ? selectedStatus : "Select Status"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandList>
                  <CommandEmpty>No status found.</CommandEmpty>
                  <CommandGroup>
                    {["pending", "processing", "shipped", "delivered", "cancelled"].map((status) => (
                      <CommandItem
                        key={status}
                        onSelect={() => {
                          setSelectedStatus(status);
                        }}
                      >
                        <CheckCheck
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedStatus === status ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {status}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.customer_name || 'Guest'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">€{order.total.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.status}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select onValueChange={(value) => handleStatusUpdate(order.id, value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {["pending", "processing", "shipped", "delivered", "cancelled"].map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface MenuTabProps {
  restaurantId: string;
}

const MenuTab: React.FC<MenuTabProps> = ({ restaurantId }) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      if (!restaurantId) return;
      
      try {
        setLoading(true);
        console.log("Fetching categories for restaurant ID:", restaurantId);
        const data = await getCategoriesByRestaurantId(restaurantId);
        console.log("Fetched categories:", data);
        setCategories(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to fetch menu categories. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchCategories();
  }, [restaurantId, toast]);

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurantId) return;
      
      try {
        console.log("Fetching topping categories for restaurant ID:", restaurantId);
        const data = await getToppingCategoriesByRestaurantId(restaurantId);
        console.log("Fetched topping categories:", data);
        setToppingCategories(data);
      } catch (error) {
        console.error("Error fetching topping categories:", error);
      }
    };

    fetchToppingCategories();
  }, [restaurantId]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (categories.length === 0) return;
      
      try {
        setLoading(true);
        const itemsByCategory: Record<string, MenuItem[]> = {};
        
        for (const category of categories) {
          const items = await getMenuItemsByCategory(category.id);
          itemsByCategory[category.id] = items;
        }
        
        setMenuItems(itemsByCategory);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching menu items:", error);
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [categories]);

  const getToppingCategoryName = (id: string) => {
    const category = toppingCategories.find(tc => tc.id === id);
    return category ? category.name : "";
  };

  const handleAddCategory = async (values: any) => {
    try {
      setSavingCategory(true);
      
      if (!restaurantId) {
        throw new Error("No restaurant selected");
      }
      
      console.log("Adding category for restaurant:", restaurantId);
      const newCategory = await createCategory({
        name: values.name,
        description: values.description || null,
        image_url: values.image_url || null,
        icon: "utensils", // Default icon
        restaurant_id: restaurantId
      });
      
      console.log("New category created:", newCategory);
      setCategories([...categories, newCategory]);
      
      toast({
        title: "Category Added",
        description: `${values.name} has been added to your menu categories.`,
      });
      
      setIsAddingCategory(false);
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add the category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      
      await deleteCategory(categoryId);
      
      setCategories(categories.filter(cat => cat.id !== categoryId));
      
      toast({
        title: "Category Deleted",
        description: "The category has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete the category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div 
                key={category.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    {getIconComponent(category.icon)}
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
              <DialogTrigger asChild>
                <div className="border border-dashed rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                  <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Menu Category</DialogTitle>
                  <DialogDescription>Create a new menu category for your restaurant.</DialogDescription>
                </DialogHeader>
                <CategoryForm 
                  onSubmit={handleAddCategory}
                  isLoading={savingCategory}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <Tabs defaultValue={categories[0].id}>
              <TabsList className="mb-4">
                {categories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id} className="flex items-center">
                    {getIconComponent(category.icon)}
                    <span className="ml-2">{category.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {categories.map((category) => (
                <TabsContent key={category.id} value={category.id}>
                  <div className="space-y-4">
                    {menuItems[category.id]?.map(item => (
                      <div 
                        key={item.id} 
                        className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="h-16 w-16 object-cover rounded-md"
                            />
                          )}
                          <div>
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            <div className="flex flex-wrap items-center mt-1">
                              <p className="text-sm font-medium">
                                €{parseFloat(item.price.toString()).toFixed(2)}
                                {item.promotion_price && (
                                  <span className="ml-2 line-through text-muted-foreground">
                                    €{parseFloat(item.promotion_price.toString()).toFixed(2)}
                                  </span>
                                )}
                              </p>
                              {item.topping_categories && item.topping_categories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 ml-2">
                                  {item.topping_categories.map((categoryId) => (
                                    <Badge 
                                      key={categoryId} 
                                      className="bg-[#D6BCFA] text-[#4C1D95] hover:bg-[#D6BCFA]/80"
                                    >
                                      {getToppingCategoryName(categoryId)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4 md:mt-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Menu Item</DialogTitle>
                                <DialogDescription>Make changes to this menu item.</DialogDescription>
                              </DialogHeader>
                              <MenuItemForm 
                                onSubmit={(values) => {
                                  console.log("Editing menu item with values:", values);
                                }}
                                initialValues={{
                                  name: item.name,
                                  description: item.description || "",
                                  price: item.price.toString(),
                                  promotion_price: item.promotion_price ? item.promotion_price.toString() : "",
                                  image: item.image || "",
                                  topping_categories: item.topping_categories || [],
                                  tax_percentage: item.tax_percentage ? item.tax_percentage.toString() : "10"
                                }}
                                restaurantId={restaurantId || ""}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="sm" className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="border border-dashed rounded-lg p-4 flex items-center justify-center">
                          <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter au panier
                          </Button>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Menu Item</DialogTitle>
                          <DialogDescription>Create a new menu item.</DialogDescription>
                        </DialogHeader>
                        <MenuItemForm 
                          onSubmit={(values) => {
                            // Handle add submission
                          }}
                          isLoading={false}
                          restaurantId={restaurantId || ""}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No categories found for this restaurant.</p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

interface ToppingsTabProps {
  restaurantId: string;
}

const ToppingsTab: React.FC<ToppingsTabProps> = ({ restaurantId }) => {
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchToppingCategories = async () => {
      if (!restaurantId) return;
      
      try {
        setLoading(true);
        console.log("Fetching topping categories for restaurant ID:", restaurantId);
        const data = await getToppingCategoriesByRestaurantId(restaurantId);
        console.log("Fetched topping categories:", data);
        setToppingCategories(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching topping categories:", error);
        toast({
          title: "Error",
          description: "Failed to fetch topping categories. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchToppingCategories();
  }, [restaurantId, toast]);

  const handleAddCategory = async (values: any) => {
    try {
      setSavingCategory(true);
      
      if (!restaurantId) {
        throw new Error("No restaurant selected");
      }
      
      console.log("Adding topping category for restaurant:", restaurantId);
      // const newCategory = await createToppingCategory({
      //   name: values.name,
      //   restaurant_id: restaurantId
      // });
      
      // console.log("New topping category created:", newCategory);
      // setToppingCategories([...toppingCategories, newCategory]);
      
      toast({
        title: "Topping Category Added",
        description: `${values.name} has been added to your topping categories.`,
      });
      
      setIsAddingCategory(false);
    } catch (error) {
      console.error("Error adding topping category:", error);
      toast({
        title: "Error",
        description: "Failed to add the topping category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      
      // await deleteToppingCategory(categoryId);
      
      // setToppingCategories(toppingCategories.filter(cat => cat.id !== categoryId));
      
      toast({
        title: "Topping Category Deleted",
        description: "The topping category has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting topping category:", error);
      toast({
        title: "Error",
        description: "Failed to delete the topping category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Topping Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {toppingCategories.map((category) => (
              <div 
                key={category.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    {getIconComponent("utensils")}
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
              <DialogTrigger asChild>
                <div className="border border-dashed rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                  <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Topping Category</DialogTitle>
                  <DialogDescription>Create a new topping category for your restaurant.</DialogDescription>
                </DialogHeader>
                {/* <ToppingCategoryForm 
                  onSubmit={handleAddCategory}
                  isLoading={savingCategory}
                /> */}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

interface StockTabProps {
  restaurantId: string;
}

const StockTab: React.FC<StockTabProps> = ({ restaurantId }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Stock Management</h2>
      <p className="text-muted-foreground">
        Manage your restaurant's stock levels
      </p>
    </div>
  );
};

interface SettingsTabProps {
  restaurant: Restaurant;
  onUpdate: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ restaurant, onUpdate }) => {
  const [name, setName] = useState(restaurant.name);
  const [slug, setSlug] = useState(restaurant.slug);
  const [location, setLocation] = useState(restaurant.location);
  const [description, setDescription] = useState(restaurant.description || "");
  const [imageUrl, setImageUrl] = useState(restaurant.image_url || "");
  const [active, setActive] = useState(restaurant.active);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateRestaurant(restaurant.id, {
        name,
        slug,
        location,
        description,
        image_url: imageUrl,
        active
      });
      toast({
        title: "Restaurant Updated",
        description: "Restaurant details have been updated.",
      });
      onUpdate();
    } catch (error) {
      console.error("Error updating restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to update restaurant details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restaurant Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <UInput id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <UInput id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <UInput id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="image_url">Image URL</Label>
          <UInput id="image_url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="active">Active</Label>
          <Switch id="active" checked={active} onCheckedChange={(checked) => setActive(checked)} />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

const RestaurantManage = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        const data = await getRestaurantById(restaurantId || "");
        setRestaurant(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching restaurant:", error);
        toast({
          title: "Error",
          description: "Failed to fetch restaurant details. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId, toast]);

  if (loading && !restaurant) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!restaurant) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Restaurant Not Found</h1>
            <p className="text-muted-foreground">
              The restaurant with the ID {restaurantId} could not be found.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {restaurant && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{restaurant.name}</h1>
              <p className="text-muted-foreground">
                {restaurant.location} · ID: {restaurant.id}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button>
                Duplicate
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="orders">
            <TabsList className="mb-8">
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              <TabsTrigger value="toppings">Toppings</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="cache">Cache</TabsTrigger>
            </TabsList>
            
            <TabsContent value="orders">
              <OrdersTab restaurantId={restaurant.id} />
            </TabsContent>
            
            <TabsContent value="menu">
              <MenuTab restaurantId={restaurant.id} />
            </TabsContent>
            
            <TabsContent value="toppings">
              <ToppingsTab restaurantId={restaurant.id} />
            </TabsContent>
            
            <TabsContent value="stock">
              <StockTab restaurantId={restaurant.id} />
            </TabsContent>
            
            <TabsContent value="settings">
              <SettingsTab 
                restaurant={restaurant} 
                onUpdate={() => {
                  // Refetch restaurant data
                  const fetchRestaurant = async () => {
                    try {
                      const data = await getRestaurantById(restaurant.id);
                      setRestaurant(data);
                    } catch (error) {
                      console.error("Error fetching restaurant:", error);
                    }
                  };
                  fetchRestaurant();
                }} 
              />
            </TabsContent>
            
            <TabsContent value="cache">
              <CacheManagement restaurantId={restaurant.id} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AdminLayout>
  );
};

export default RestaurantManage;
