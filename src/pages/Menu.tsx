
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Beef, Coffee, Edit, Pizza, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
};

type MenuCategory = {
  id: string;
  name: string;
  restaurantId: string;
  icon: React.ReactNode;
};

const mockCategories: MenuCategory[] = [
  { id: "1", name: "Burgers", restaurantId: "1", icon: <Beef className="h-4 w-4" /> },
  { id: "2", name: "Pizzas", restaurantId: "1", icon: <Pizza className="h-4 w-4" /> },
  { id: "3", name: "Drinks", restaurantId: "1", icon: <Coffee className="h-4 w-4" /> },
];

const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Classic Burger",
    description: "Beef patty, lettuce, tomato, pickles, and our special sauce.",
    price: 8.99,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "1"
  },
  {
    id: "2",
    name: "Cheese Burger",
    description: "Beef patty, American cheese, lettuce, tomato, and mayo.",
    price: 9.99,
    image: "https://images.unsplash.com/photo-1550317138-10000687a72b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "1"
  },
  {
    id: "3",
    name: "Margherita Pizza",
    description: "Fresh mozzarella, tomatoes, and basil on our house-made dough.",
    price: 12.99,
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "2"
  },
  {
    id: "4",
    name: "Pepperoni Pizza",
    description: "Pepperoni, mozzarella, and our signature tomato sauce.",
    price: 14.99,
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "2"
  },
  {
    id: "5",
    name: "Iced Coffee",
    description: "Cold brewed coffee served over ice.",
    price: 3.99,
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "3"
  },
];

const MenuPage = () => {
  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage your restaurant's menu categories and items
          </p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Restaurant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Burger House</SelectItem>
              <SelectItem value="2">Pizza Palace</SelectItem>
              <SelectItem value="3">Sushi Squad</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-kiosk-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockCategories.map((category) => (
              <div 
                key={category.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    {category.icon}
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="border border-dashed rounded-lg p-4 flex items-center justify-center">
              <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="1">
            <TabsList className="mb-4">
              {mockCategories.map((category) => (
                <TabsTrigger key={category.id} value={category.id} className="flex items-center">
                  {category.icon}
                  <span className="ml-2">{category.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {mockCategories.map((category) => (
              <TabsContent key={category.id} value={category.id}>
                <div className="space-y-4">
                  {mockMenuItems
                    .filter(item => item.category === category.id)
                    .map(item => (
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
                            <p className="text-sm font-medium mt-1">${item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4 md:mt-0">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  <div className="border border-dashed rounded-lg p-4 flex items-center justify-center">
                    <Button variant="ghost" className="w-full h-full flex items-center justify-center">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Item to {category.name}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default MenuPage;
