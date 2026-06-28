import en from "../../messages/en.json";

type Messages = typeof en;

declare global {
  // Use type safe messages keys with `next-intl`
  interface IntlMessages extends Messages {}
}
