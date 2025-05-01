import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/router';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreHorizontal, Edit, Copy, Trash, AlertCircle } from "lucide-react"
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createCategory,
  getCategoriesByRestaurantId,
  updateCategory,
  deleteCategory,
  createMenuItem,
  getMenuItemsByCategory,
  updateMenuItem,
  deleteMenuItem,
  getRestaurantBySlug,
  getToppingCategoriesByRestaurantId,
  getMenuItemById,
  duplicateRestaurant
} from "@/services/kiosk-service";
import { Restaurant, MenuCategory, MenuItem, ToppingCategory } from "@/types/database-types";
import MenuItemForm from "@/components/forms/MenuItemForm";
import CategoryForm from "@/components/forms/CategoryForm";
import { useSession } from "next-auth/react";
import { useRouter as useNextRouter } from 'next/navigation';
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { SkeletonCategoryCard } from "@/components/ui/skeleton-category-card";
import { SkeletonCategoryTable } from "@/components/ui/skeleton-category-table";
import { SkeletonMenuItemTable } from "@/components/ui/skeleton-menu-item-table";
import { SkeletonRestaurantCard } from "@/components/ui/skeleton-restaurant-card";
import { SkeletonToppingCategoryCard } from "@/components/ui/skeleton-topping-category-card";
import { SkeletonToppingTable } from "@/components/ui/skeleton-topping-table";
import { SkeletonToppingCard } from "@/components/ui/skeleton-topping-card";
import { ToppingForm } from "@/components/forms/ToppingForm";
import {
  createTopping,
  getToppingsByCategory,
  updateTopping,
  deleteTopping,
  createToppingCategory,
  updateToppingCategory,
  deleteToppingCategory,
  getToppingsForRestaurant
} from "@/services/kiosk-service";
import ToppingCategoryForm from "@/components/forms/ToppingCategoryForm";
import { GripVertical } from "lucide-react";
import { revalidatePath } from 'next/cache'
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Settings } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SkeletonOrderTable } from "@/components/ui/skeleton-order-table";
import { SkeletonUserTable } from "@/components/ui/skeleton-user-table";
import { SkeletonDashboard } from "@/components/ui/skeleton-dashboard";
import { SkeletonKiosk } from "@/components/ui/skeleton-kiosk";
import { SkeletonCategoryCardList } from "@/components/ui/skeleton-category-card-list";
import { SkeletonMenuItemCardList } from "@/components/ui/skeleton-menu-item-card-list";
import { SkeletonToppingCategoryCardList } from "@/components/ui/skeleton-topping-category-card-list";
import { SkeletonToppingCardList } from "@/components/ui/skeleton-topping-card-list";
import { SkeletonOrderItemTable } from "@/components/ui/skeleton-order-item-table";
import { SkeletonOrderItemCardList } from "@/components/ui/skeleton-order-item-card-list";
import { SkeletonCategoryTableList } from "@/components/ui/skeleton-category-table-list";
import { SkeletonMenuItemTableList } from "@/components/ui/skeleton-menu-item-table-list";
import { SkeletonToppingCategoryTableList } from "@/components/ui/skeleton-topping-category-table-list";
import { SkeletonToppingTableList } from "@/components/ui/skeleton-topping-table-list";
import { SkeletonKioskCardList } from "@/components/ui/skeleton-kiosk-card-list";
import { SkeletonOrderCardList } from "@/components/ui/skeleton-order-card-list";
import { SkeletonUserCardList } from "@/components/ui/skeleton-user-card-list";
import { SkeletonOrderItemTableList } from "@/components/ui/skeleton-order-item-table-list";
import { SkeletonOrderItemCard } from "@/components/ui/skeleton-order-item-card";
import { SkeletonOrderTableList } from "@/components/ui/skeleton-order-table-list";
import { SkeletonUserTableList } from "@/components/ui/skeleton-user-table-list";
import { SkeletonOrderCard } from "@/components/ui/skeleton-order-card";
import { SkeletonUserCard } from "@/components/ui/skeleton-user-card";
import { SkeletonKioskCard } from "@/components/ui/skeleton-kiosk-card";
import { SkeletonKioskTableList } from "@/components/ui/skeleton-kiosk-table-list";
import { SkeletonKioskTable } from "@/components/ui/skeleton-kiosk-table";
import { SkeletonCategoryCardTable } from "@/components/ui/skeleton-category-card-table";
import { SkeletonMenuItemCardTable } from "@/components/ui/skeleton-menu-item-card-table";
import { SkeletonToppingCategoryCardTable } from "@/components/ui/skeleton-topping-category-card-table";
import { SkeletonToppingCardTable } from "@/components/ui/skeleton-topping-card-table";
import { SkeletonOrderItemCardTable } from "@/components/ui/skeleton-order-item-card-table";
import { SkeletonOrderCardTable } from "@/components/ui/skeleton-order-card-table";
import { SkeletonUserCardTable } from "@/components/ui/skeleton-user-card-table";
import { SkeletonKioskCardTable } from "@/components/ui/skeleton-kiosk-card-table";
import { SkeletonCategoryCardListTable } from "@/components/ui/skeleton-category-card-list-table";
import { SkeletonMenuItemCardListTable } from "@/components/ui/skeleton-menu-item-card-list-table";
import { SkeletonToppingCategoryCardListTable } from "@/components/ui/skeleton-topping-category-card-list-table";
import { SkeletonToppingCardListTable } from "@/components/ui/skeleton-topping-card-list-table";
import { SkeletonOrderItemCardListTable } from "@/components/ui/skeleton-order-item-card-list-table";
import { SkeletonOrderCardListTable } from "@/components/ui/skeleton-order-card-list-table";
import { SkeletonUserCardListTable } from "@/components/ui/skeleton-user-card-list-table";
import { SkeletonKioskCardListTable } from "@/components/ui/skeleton-kiosk-card-list-table";
import { SkeletonCategoryCardListCard } from "@/components/ui/skeleton-category-card-list-card";
import { SkeletonMenuItemCardListCard } from "@/components/ui/skeleton-menu-item-card-list-card";
import { SkeletonToppingCategoryCardListCard } from "@/components/ui/skeleton-topping-category-card-list-card";
import { SkeletonToppingCardListCard } from "@/components/ui/skeleton-topping-card-list-card";
import { SkeletonOrderItemCardListCard } from "@/components/ui/skeleton-order-item-card-list-card";
import { SkeletonOrderCardListCard } from "@/components/ui/skeleton-order-card-list-card";
import { SkeletonUserCardListCard } from "@/components/ui/skeleton-user-card-list-card";
import { SkeletonKioskCardListCard } from "@/components/ui/skeleton-kiosk-card-list-card";
import { SkeletonCategoryCardListTableCard } from "@/components/ui/skeleton-category-card-list-table-card";
import { SkeletonMenuItemCardListTableCard } from "@/components/ui/skeleton-menu-item-card-list-table-card";
import { SkeletonToppingCategoryCardListTableCard } from "@/components/ui/skeleton-topping-category-card-list-table-card";
import { SkeletonToppingCardListTableCard } from "@/components/ui/skeleton-topping-card-list-table-card";
import { SkeletonOrderItemCardListTableCard } from "@/components/ui/skeleton-order-item-card-list-table-card";
import { SkeletonOrderCardListTableCard } from "@/components/ui/skeleton-order-card-list-table-card";
import { SkeletonUserCardListTableCard } from "@/components/ui/skeleton-user-card-list-table-card";
import { SkeletonKioskCardListTableCard } from "@/components/ui/skeleton-kiosk-card-list-table-card";
import { SkeletonCategoryCardTableCard } from "@/components/ui/skeleton-category-card-table-card";
import { SkeletonMenuItemCardTableCard } from "@/components/ui/skeleton-menu-item-card-table-card";
import { SkeletonToppingCategoryCardTableCard } from "@/components/ui/skeleton-topping-category-card-table-card";
import { SkeletonToppingCardTableCard } from "@/components/ui/skeleton-topping-card-table-card";
import { SkeletonOrderItemCardTableCard } from "@/components/ui/skeleton-order-item-card-table-card";
import { SkeletonOrderCardTableCard } from "@/components/ui/skeleton-order-card-table-card";
import { SkeletonUserCardTableCard } from "@/components/ui/skeleton-user-card-table-card";
import { SkeletonKioskCardTableCard } from "@/components/ui/skeleton-kiosk-card-table-card";
import { SkeletonCategoryTableListCard } from "@/components/ui/skeleton-category-table-list-card";
import { SkeletonMenuItemTableListCard } from "@/components/ui/skeleton-menu-item-table-list-card";
import { SkeletonToppingCategoryTableListCard } from "@/components/ui/skeleton-topping-category-table-list-card";
import { SkeletonToppingTableListCard } from "@/components/ui/skeleton-topping-table-list-card";
import { SkeletonOrderItemTableListCard } from "@/components/ui/skeleton-order-item-table-list-card";
import { SkeletonOrderTableListCard } from "@/components/ui/skeleton-order-table-list-card";
import { SkeletonUserTableListCard } from "@/components/ui/skeleton-user-table-list-card";
import { SkeletonKioskTableListCard } from "@/components/ui/skeleton-kiosk-table-list-card";
import { SkeletonCategoryTableCard } from "@/components/ui/skeleton-category-table-card";
import { SkeletonMenuItemTableCard } from "@/components/ui/skeleton-menu-item-table-card";
import { SkeletonToppingCategoryTableCard } from "@/components/ui/skeleton-topping-category-table-card";
import { SkeletonToppingTableCard } from "@/components/ui/skeleton-topping-table-card";
import { SkeletonOrderItemTableCard } from "@/components/ui/skeleton-order-item-table-card";
import { SkeletonOrderTableCard } from "@/components/ui/skeleton-order-table-card";
import { SkeletonUserTableCard } from "@/components/ui/skeleton-user-table-card";
import { SkeletonKioskTableCard } from "@/components/ui/skeleton-kiosk-table-card";
import { SkeletonCategoryCardListTableCardCard } from "@/components/ui/skeleton-category-card-list-table-card-card";
import { SkeletonMenuItemCardListTableCardCard } from "@/components/ui/skeleton-menu-item-card-list-table-card-card";
import { SkeletonToppingCategoryCardListTableCardCard } from "@/components/ui/skeleton-topping-category-card-list-table-card-card";
import { SkeletonToppingCardListTableCardCard } from "@/components/ui/skeleton-topping-card-list-table-card-card";
import { SkeletonOrderItemCardListTableCardCard } from "@/components/ui/skeleton-order-item-card-list-table-card-card";
import { SkeletonOrderCardListTableCardCard } from "@/components/ui/skeleton-order-card-list-table-card-card";
import { SkeletonUserCardListTableCardCard } from "@/components/ui/skeleton-user-card-list-table-card-card";
import { SkeletonKioskCardListTableCardCard } from "@/components/ui/skeleton-kiosk-card-list-table-card-card";
import { SkeletonCategoryCardTableCardCard } from "@/components/ui/skeleton-category-card-table-card-card";
import { SkeletonMenuItemCardTableCardCard } from "@/components/ui/skeleton-menu-item-card-table-card-card";
import { SkeletonToppingCategoryCardTableCardCard } from "@/components/ui/skeleton-topping-category-card-table-card-card";
import { SkeletonToppingCardTableCardCard } from "@/components/ui/skeleton-topping-card-table-card-card";
import { SkeletonOrderItemCardTableCardCard } from "@/components/ui/skeleton-order-item-card-table-card-card";
import { SkeletonOrderCardTableCardCard } from "@/components/ui/skeleton-order-card-table-card-card";
import { SkeletonUserCardTableCardCard } from "@/components/ui/skeleton-user-card-table-card-card";
import { SkeletonKioskCardTableCardCard } from "@/components/ui/skeleton-kiosk-card-table-card-card";
import { SkeletonCategoryTableListCardCard } from "@/components/ui/skeleton-category-table-list-card-card";
import { SkeletonMenuItemTableListCardCard } from "@/components/ui/skeleton-menu-item-table-list-card-card";
import { SkeletonToppingCategoryTableListCardCard } from "@/components/ui/skeleton-topping-category-table-list-card-card";
import { SkeletonToppingTableListCardCard } from "@/components/ui/skeleton-topping-table-list-card-card";
import { SkeletonOrderItemTableListCardCard } from "@/components/ui/skeleton-order-item-table-list-card-card";
import { SkeletonOrderTableListCardCard } from "@/components/ui/skeleton-order-table-list-card-card";
import { SkeletonUserTableListCardCard } from "@/components/ui/skeleton-user-table-list-card-card";
import { SkeletonKioskTableListCardCard } from "@/components/ui/skeleton-kiosk-table-list-card-card";
import { SkeletonCategoryTableCardCard } from "@/components/ui/skeleton-category-table-card-card";
import { SkeletonMenuItemTableCardCard } from "@/components/ui/skeleton-menu-item-table-card-card";
import { SkeletonToppingCategoryTableCardCard } from "@/components/ui/skeleton-topping-category-table-card-card";
import { SkeletonToppingTableCardCard } from "@/components/ui/skeleton-topping-table-card-card";
import { SkeletonOrderItemTableCardCard } from "@/components/ui/skeleton-order-item-table-card-card";
import { SkeletonOrderTableCardCard } from "@/components/ui/skeleton-order-table-card-card";
import { SkeletonUserTableCardCard } from "@/components/ui/skeleton-user-table-card-card";
import { SkeletonKioskTableCardCard } from "@/components/ui/skeleton-kiosk-table-card-card";
import { SkeletonCategoryCardListCardCardCard } from "@/components/ui/skeleton-category-card-list-card-card-card";
import { SkeletonMenuItemCardListCardCardCard } from "@/components/ui/skeleton-menu-item-card-list-card-card-card";
import { SkeletonToppingCategoryCardListCardCardCard } from "@/components/ui/skeleton-topping-category-card-list-card-card-card";
import { SkeletonToppingCardListCardCardCard } from "@/components/ui/skeleton-topping-card-list-card-card-card";
import { SkeletonOrderItemCardListCardCardCard } from "@/components/ui/skeleton-order-item-card-list-card-card-card";
import { SkeletonOrderCardListCardCardCard } from "@/components/ui/skeleton-order-card-list-card-card-card";
import { SkeletonUserCardListCardCardCard } from "@/components/ui/skeleton-user-card-list-card-card-card";
import { SkeletonKioskCardListCardCardCard } from "@/components/ui/skeleton-kiosk-card-list-card-card-card";
import { SkeletonCategoryCardTableCardCardCard } from "@/components/ui/skeleton-category-card-table-card-card-card";
import { SkeletonMenuItemCardTableCardCardCard } from "@/components/ui/skeleton-menu-item-card-table-card-card-card";
import { SkeletonToppingCategoryCardTableCardCardCard } from "@/components/ui/skeleton-topping-category-card-table-card-card-card";
import { SkeletonToppingCardTableCardCardCard } from "@/components/ui/skeleton-topping-card-table-card-card-card";
import { SkeletonOrderItemCardTableCardCardCard } from "@/components/ui/skeleton-order-item-card-table-card-card-card";
import { SkeletonOrderCardTableCardCardCard } from "@/components/ui/skeleton-order-card-table-card-card-card";
import { SkeletonUserCardTableCardCardCard } from "@/components/ui/skeleton-user-card-table-card-card-card";
import { SkeletonKioskCardTableCardCardCard } from "@/components/ui/skeleton-kiosk-card-table-card-card-card";
import { SkeletonCategoryTableListCardCardCard } from "@/components/ui/skeleton-category-table-list-card-card-card";
import { SkeletonMenuItemTableListCardCardCard } from "@/components/ui/skeleton-menu-item-table-list-card-card-card";
import { SkeletonToppingCategoryTableListCardCardCard } from "@/components/ui/skeleton-topping-category-table-list-card-card-card";
import { SkeletonToppingTableListCardCardCard } from "@/components/ui/skeleton-topping-table-list-card-card-card";
import { SkeletonOrderItemTableListCardCardCard } from "@/components/ui/skeleton-order-item-table-list-card-card-card";
import { SkeletonOrderTableListCardCardCard } from "@/components/ui/skeleton-order-table-list-card-card-card";
import { SkeletonUserTableListCardCardCard } from "@/components/ui/skeleton-user-table-list-card-card-card";
import { SkeletonKioskTableListCardCardCard } from "@/components/ui/skeleton-kiosk-table-list-card-card-card";
import { SkeletonCategoryTableCardCardCard } from "@/components/ui/skeleton-category-table-card-card-card";
import { SkeletonMenuItemTableCardCardCard } from "@/components/ui/skeleton-menu-item-table-card-card-card";
import { SkeletonToppingCategoryTableCardCardCard } from "@/components/ui/skeleton-topping-category-table-card-card-card";
import { SkeletonToppingTableCardCardCard } from "@/components/ui/skeleton-topping-table-card-card-card";
import { SkeletonOrderItemTableCardCardCard } from "@/components/ui/skeleton-order-item-table-card-card-card";
import { SkeletonOrderTableCardCardCard } from "@/components/ui/skeleton-order-table-card-card-card";
import { SkeletonUserTableCardCardCard } from "@/components/ui/skeleton-user-table-card-card-card";
import { SkeletonKioskTableCardCardCard } from "@/components/ui/skeleton-kiosk-table-card-card-card";
import { SkeletonCategoryCardListCardCardCardCard } from "@/components/ui/skeleton-category-card-list-card-card-card-card";
import { SkeletonMenuItemCardListCardCardCardCard } from "@/components/ui/skeleton-menu-item-card-list-card-card-card-card";
import { SkeletonToppingCategoryCardListCardCardCardCard } from "@/components/ui/skeleton-topping-category-card-list-card-card-card-card";
import { SkeletonToppingCardListCardCardCardCard } from "@/components/ui/skeleton-topping-card-list-card-card-card-card";
import { SkeletonOrderItemCardListCardCardCardCard } from "@/components/ui/skeleton-order-item-card-list-card-card-card-card";
import { SkeletonOrderCardListCardCardCardCard } from "@/components/ui/skeleton-order-card-list-card-card-card-card";
import { SkeletonUserCardListCardCardCardCard } from "@/components/ui/skeleton-user-card-list-card-card-card-card";
import { SkeletonKioskCardListCardCardCardCard } from "@/components/ui/skeleton-kiosk-card-list-card-card-card-card";
import { SkeletonCategoryCardTableCardCardCardCard } from "@/components/ui/skeleton-category-card-table-card-card-card-card";
import { SkeletonMenuItemCardTableCardCardCardCard } from "@/components/ui/skeleton-menu-item-card-table-card-card-card-card";
import { SkeletonToppingCategoryCardTableCardCardCardCard } from "@/components/ui/skeleton-topping-category-card-table-card-card-card-card";
import { SkeletonToppingCardTableCardCardCardCard } from "@/components/ui/skeleton-topping-card-table-card-card-card-card";
import { SkeletonOrderItemCardTableCardCardCardCard } from "@/components/ui/skeleton-order-item-card-table-card-card-card-card";
import { SkeletonOrderCardTableCardCardCardCard } from "@/components/ui/skeleton-order-card-table-card-card-card-card";
import { SkeletonUserCardTableCardCardCardCard } from "@/components/ui/skeleton-user-card-table-card-card-card-card";
import { SkeletonKioskCardTableCardCardCardCard } from "@/components/ui/skeleton-kiosk-card-table-card-card-card-card";
import { SkeletonCategoryTableListCardCardCardCard } from "@/components/ui/skeleton-category-table-list-card-card-card-card";
import { SkeletonMenuItemTableListCardCardCardCard } from "@/components/ui/skeleton-menu-item-table-list-card-card-card-card";
import { SkeletonToppingCategoryTableListCardCardCardCard } from "@/components/ui/skeleton-topping-category-table-list-card-card-card-card";
import { SkeletonToppingTableListCardCardCardCard } from "@/components/ui/skeleton-topping-table-list-card-card-card-card";
import { SkeletonOrderItemTableListCardCardCardCard } from "@/components/ui/skeleton-order-item-table-list-card-card-card-card";
import { SkeletonOrderTableListCardCardCardCard } from "@/components/ui/skeleton-order-table-list-card-card-card-card";
import { SkeletonUserTableListCardCardCardCard } from "@/components/ui/skeleton-user-table-list-card-card-card-card";
import { SkeletonKioskTableListCardCardCardCard } from "@/components/ui/skeleton-kiosk-table-list-card-card-card-card";
import { SkeletonCategoryTableCardCardCardCard } from "@/components/ui/skeleton-category-table-card-card-card-card";
import { SkeletonMenuItemTableCardCardCardCard } from "@/components/ui/skeleton-menu-item-table-card-card-card-card";
import { SkeletonToppingCategoryTableCardCardCardCard } from "@/components/ui/skeleton-topping-category-table-card-card-card-card";
import { SkeletonToppingTableCardCardCardCard } from "@/components/ui/skeleton-topping-table-card-card-card-card";
import { SkeletonOrderItemTableCardCardCardCard } from "@/components/ui/skeleton-order-item-table-card-card-card-card";
import { SkeletonOrderTableCardCardCardCard } from "@/components/ui/skeleton-order-table-card-card-card-card";
import { SkeletonUserTableCardCardCardCard } from "@/components/ui/skeleton-user-table-card-card-card-card";
import { SkeletonKioskTableCardCardCardCard } from "@/components/ui/skeleton-kiosk-table-card-card-card-card";

interface DataTableProps {
  columns: any;
  data: any;
}

function DataTable({ columns, data }: DataTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {columns.map((column: any) => (
            <TableHead key={column.id}>{column.header}</TableHead>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((row: any) => (
            <TableRow key={row.id}>
              {columns.map((column: any) => (
                <TableCell key={`${row.id}-${column.id}`}>
                  {column.cell ? column.cell(row) : row[column.accessorKey]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const Menu = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [toppingCategories, setToppingCategories] = useState<ToppingCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [selectedToppingCategory, setSelectedToppingCategory] = useState<ToppingCategory | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isMenuItemDialogOpen, setIsMenuItemDialogOpen] = useState(false);
  const [isToppingCategoryDialogOpen, setIsToppingCategoryDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [selectedTopping, setSelectedTopping] = useState(null);
  const [isToppingDialogOpen, setIsToppingDialogOpen] = useState(false);
  const router = useRouter();
  const { slug } = router.query;
  const { toast } = useToast();
  const { data: session } = useSession();
  const nextRouter = useNextRouter();
  const t = useTranslations('Menu');
  const locale = useLocale();

  const categoryColumns = [
    {
      id: "name",
      header: t('categoryName'),
      accessorKey: "name",
    },
    {
      id: "description",
      header: t('description'),
      accessorKey: "description",
    },
    {
      id: "display_order",
      header: t('displayOrder'),
      accessorKey: "display_order",
    },
    {
      id: "actions",
      header: t('actions'),
      cell: (row: MenuCategory) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t('openMenu')}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEditCategory(row)}>
              <Edit className="mr-2 h-4 w-4" /> {t('edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDeleteCategory(row.id)}>
              <Trash className="mr-2 h-4 w-4" /> {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const menuItemColumns = [
    {
      id: "name",
      header: t('menuItemName'),
      accessorKey: "name",
    },
    {
      id: "price",
      header: t('price'),
      accessorKey: "price",
      cell: ({ price }: MenuItem) => {
        const formatted = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: restaurant?.currency || 'USD',
        }).format(price);
        return formatted;
      },
    },
    {
      id: "promotion_price",
      header: t('promotionPrice'),
      accessorKey: "promotion_price",
      cell: ({ promotion_price }: MenuItem) => {
        if (!promotion_price) return '-';
        const formatted = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: restaurant?.currency || 'USD',
        }).format(promotion_price);
        return formatted;
      },
    },
    {
      id: "in_stock",
      header: t('inStock'),
      accessorKey: "in_stock",
      cell: ({ in_stock }: MenuItem) => (
        <Badge variant={in_stock ? "default" : "destructive"}>
          {in_stock ? t('yes') : t('no')}
        </Badge>
      ),
    },
    {
      id: "display_order",
      header: t('displayOrder'),
      accessorKey: "display_order",
    },
    {
      id: "actions",
      header: t('actions'),
      cell: (row: MenuItem) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t('openMenu')}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEditMenuItem(row)}>
              <Edit className="mr-2 h-4 w-4" /> {t('edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDeleteMenuItem(row.id)}>
              <Trash className="mr-2 h-4 w-4" /> {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const toppingCategoryColumns = [
    {
      id: "name",
      header: t('toppingCategoryName'),
      accessorKey: "name",
    },
    {
      id: "description",
      header: t('description'),
      accessorKey: "description",
    },
    {
      id: "actions",
      header: t('actions'),
      cell: (row: ToppingCategory) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t('openMenu')}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEditToppingCategory(row)}>
              <Edit className="mr-2 h-4 w-4" /> {t('edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDeleteToppingCategory(row.id)}>
              <Trash className="mr-2 h-4 w-4" /> {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const toppingColumns = (categoryId: string) => [
    {
      id: "name",
      header: t('toppingName'),
      accessorKey: "name",
    },
    {
      id: "price",
      header: t('price'),
      accessorKey: "price",
      cell: ({ price }: any) => {
        const formatted = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: restaurant?.currency || 'USD',
        }).format(price);
        return formatted;
      },
    },
    {
      id: "in_stock",
      header: t('inStock'),
      accessorKey: "in_stock",
      cell: ({ in_stock }: any) => (
        <Badge variant={in_stock ? "default" : "destructive"}>
          {in_stock ? t('yes') : t('no')}
        </Badge>
      ),
    },
    {
      id: "display_order",
      header: t('displayOrder'),
      accessorKey: "display_order",
    },
    {
      id: "actions",
      header: t('actions'),
      cell: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">{t('
