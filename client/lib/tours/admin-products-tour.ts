import type { StepType } from "@reactour/tour"

export const adminProductsSteps: StepType[] = [
  {
    selector: '[data-tour="admin-products-header"]',
    content:
      "Welcome to the Products page! This is where you manage everything in the shop " +
      "catalog — item names, prices, stock levels, and whether each product is visible " +
      "to customers.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-products-add"]',
    content:
      "Click 'Add Product' to open the product editor and create a brand-new shop item. " +
      "You'll set the name, price, stock, category, image, and description before saving.",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-products-editor"]',
    content:
      "The Product Editor appears here whenever you're creating or editing a product:\n\n" +
      "• Name, Price, and Stock — the core catalog fields\n" +
      "• Category — which shop section the product is grouped under\n" +
      "• Image URL — the photo shown to customers\n" +
      "• Active toggle — controls whether it's visible in the shop\n" +
      "• Description — the longer write-up customers see on the product page\n\n" +
      "Click 'Create' or 'Save' when you're happy with the details, or 'Cancel' to discard.",
    position: "top",
  },
  {
    selector: '[data-tour="admin-products-stats"]',
    content:
      "This bar gives you a quick catalog summary — the total number of products, how " +
      "many are currently active, and how many are running low on stock (5 units or fewer).",
    position: "bottom",
  },
  {
    selector: '[data-tour="admin-products-list"]',
    content:
      "The Product Library table lists every product with its category, price, stock " +
      "count, and status. Use 'Edit' to update a product's details, or 'Delete' to remove " +
      "it from the catalog permanently — you'll be asked to confirm before it's deleted.",
    position: "top",
  },
]
