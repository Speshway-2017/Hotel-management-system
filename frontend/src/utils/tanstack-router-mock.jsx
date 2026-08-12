import React, { createContext, useContext } from 'react';
import { Link as RouterLink, useLocation, useParams, useNavigate as useRouterNavigate } from 'react-router-dom';

// Context for TanStack Router Loader Data
export const LoaderDataContext = createContext({});

export function createFileRoute(path) {
  const RouteObj = {
    useLoaderData: () => {
      return useContext(LoaderDataContext);
    },
    useParams: () => {
      return useParams();
    }
  };

  return function(config) {
    RouteObj._config = config;
    RouteObj.component = config.component;
    return RouteObj;
  };
}

export function notFound() {
  return new Error("Not Found");
}

export function Link({ to, params, ...props }) {
  let targetTo = to;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      targetTo = targetTo.replace(`$${k}`, v);
    });
  }
  return <RouterLink to={targetTo} {...props} />;
}

export function useRouterState(config) {
  const location = useLocation();
  if (config && config.select) {
    return config.select({ location });
  }
  return location;
}

export function useNavigate() {
  const navigate = useRouterNavigate();
  return ({ to, params }) => {
    let path = to;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        path = path.replace(`$${k}`, v);
      });
    }
    navigate(path);
  };
}

export { Outlet } from 'react-router-dom';
