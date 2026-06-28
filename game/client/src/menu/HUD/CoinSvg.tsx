import { colorGreen } from "../styles/colors";

import { STYLES } from "./styles";

export const METACUBE_LOGO_PATH =
  "M229.496 2.807C226.408 1.022 222.823 0 219 0s-7.408 1.022-10.496 2.807L208.5 2.8l-98 57 .004.007C104.225 63.438 100 70.225 100 78c0 11.598 9.402 21 21 21 3.823 0 7.408-1.022 10.496-2.807l.004.007L219 45.307 306.5 96.2l.004-.007C309.592 97.978 313.177 99 317 99c11.598 0 21-9.402 21-21 0-7.775-4.225-14.562-10.504-18.193l.004-.007-98-57-.004.007zM21 116c3.619 0 7.024.915 9.996 2.527l.004-.007 187.924 108.54L406.16 119l.004.008A20.9 20.9 0 0 1 417 116c11.598 0 21 9.402 21 21v225c0 11.598-9.402 21-21 21s-21-9.402-21-21V173.383l-156 90.033V480c0 11.598-9.402 21-21 21s-21-9.402-21-21V263.504L42 173.402V362c0 11.598-9.402 21-21 21s-21-9.402-21-21V137c0-11.598 9.402-21 21-21z";

const MetacubeCoinBody = () => (
  <>
    <circle
      cx="219"
      cy="250.5"
      r="290"
      fill="#000"
      stroke={colorGreen}
      strokeWidth="42"
    />
    <path fillRule="evenodd" d={METACUBE_LOGO_PATH} fill={colorGreen} />
  </>
);

export const MetacubeCoinSvg = ({
  wh,
}: {
  wh: string | number | undefined;
}) => (
  <svg
    width={wh}
    height={wh}
    viewBox="-116 -85 670 670"
    xmlns="http://www.w3.org/2000/svg"
    style={STYLES.COIN_SVG_LARGE}
  >
    <MetacubeCoinBody />
  </svg>
);

export const METACUBE_COIN_SVG2 = (
  <svg
    width="15"
    height="15"
    viewBox="-126 -95 690 690"
    xmlns="http://www.w3.org/2000/svg"
  >
    <MetacubeCoinBody />
  </svg>
);
