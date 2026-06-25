import { useRef, useState, useCallback, useEffect } from "react";

export const useFormLogic = (
  schema,
  doSubmit,
  initialValues = {},
  options = { validateOnType: false, debounceTime: 500, storageKey: null }
) => {
  const [formData, setFormData] = useState(() => {
    let data = initialValues;
    if (options?.storageKey) {
      try {
        const stored = sessionStorage.getItem(options.storageKey);
        if (stored) {
          // Merge so we don't lose new initial structure
          data = { ...initialValues, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.error("Failed to restore form data from session", e);
      }
    }
    return { data, errors: {} };
  });

  const fieldRefs = useRef({});
  const debounceTimer = useRef(null);

  const getFormData = useCallback(() => formData, [formData]);
  const getData = useCallback(() => formData.data, [formData.data]);

  const setData = useCallback((data) => {
    setFormData((prev) => ({ ...prev, data }));
  }, []);

  const setErrors = useCallback((errors) => {
    setFormData((prev) => ({ ...prev, errors }));
  }, []);


  useEffect(() => {
    if (!options?.storageKey) return;

    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(options.storageKey, JSON.stringify(formData.data));
      } catch (e) {
        console.error("Failed to save form data to session", e);
      }
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timer);
  }, [formData.data, options?.storageKey]);


  const clearStorage = useCallback(() => {
    if (options?.storageKey) {
      sessionStorage.removeItem(options.storageKey);
    }
  }, [options?.storageKey]);

  const setField = useCallback((name, value) => {
    setFormData((prev) => {
      const data = { ...prev.data, [name]: value };
      return { ...prev, data };
    });
  }, []);

  const refCaches = useRef({});
  const registerRef = useCallback((name) => {
    if (!refCaches.current[name]) {
      refCaches.current[name] = (el) => {
        if (fieldRefs.current) {
          fieldRefs.current[name] = el;
        }
      };
    }
    return refCaches.current[name];
  }, []);

  const validateInput = useCallback(
    (name, value) => {
      const data = { ...formData.data, [name]: value };

      if (schema && schema.validate) {
        const { error } = schema.validate(data, { abortEarly: false });
        if (!error) return null;
        const fieldError = error.details.find((d) => d.path[0] === name);
        return fieldError ? fieldError.message : null;
      }
      return null;
    },
    [formData.data, schema]
  );

  const timeoutRefs = useRef({});

  const handleNumberChange = useCallback(({ currentTarget: inp }) => {
    let { name, value } = inp;
    value = value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) return;

    setFormData((prev) => {
      const nextData = { ...prev.data, [name]: value };
      return { ...prev, data: nextData };
    });
    debounceValidate(name);
  }, []);

  const getRegex = useCallback((restriction) => {
    switch (restriction) {
      case "numeric":
        return /^[0-9]*$/;
      case "numericWithDot":
        return /^[0-9.]*$/;
      case "alphabet":
        return /^[A-Za-z]*$/;
      case "alphabetSpace":
        return /^[A-Za-z\s]*$/;
      case "alphabetSpaceCama":
        return /^[A-Za-z\s,]*$/;
      case "alphanumeric":
        return /^[A-Za-z0-9]*$/;
      case "alphanumericspace":
        return /^[A-Za-z0-9\s]*$/;
      case "alphahyp_apostro_spa":
        return /^[A-Za-z\s'-]*$/;
      case "alphabetnew":
        return /^[a-zA-Z0-9@._%+-]*$/;
      default:
        return null;
    }
  }, []);

  const debounceValidate = useCallback(
    (name) => {
      if (!options.validateOnType) return;

      if (timeoutRefs.current[name]) {
        clearTimeout(timeoutRefs.current[name]);
      }

      timeoutRefs.current[name] = setTimeout(() => {
        setFormData((prev) => {
          if (schema && schema.validate) {
            // Only validate the single field's current state against the schema if possible,
            // or validate the whole schema and extract the error for this field.
            const { error } = schema.validate(prev.data, { abortEarly: false });
            let errorMsg = null;

            if (error) {
              const fieldError = error.details.find((d) => d.path[0] === name);
              if (fieldError) errorMsg = fieldError.message;
            }

            if (prev.errors[name] !== errorMsg) {
              const nextErrors = { ...prev.errors };
              if (errorMsg) nextErrors[name] = errorMsg;
              else delete nextErrors[name];
              return { ...prev, errors: nextErrors };
            }
          }
          return prev;
        });
      }, options.debounceTime);
    },
    [schema, options.validateOnType, options.debounceTime]
  );

  const handleInputChange = useCallback(
    (e, restriction = null) => {
      const { name, value } = e.currentTarget;

      if (restriction) {
        const regex = getRegex(restriction);
        if (regex && !regex.test(value)) return;
        if (restriction === "numericWithDot" && value.split(".").length > 2)
          return;
      }

      setFormData((prev) => {
        const nextData = { ...prev.data };

        // Handle nested paths like "address.city"
        if (name.includes(".")) {
          const keys = name.split(".");
          let current = nextData;
          for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
        } else {
          nextData[name] = value;
        }

        // If they had an error, we instantly clear it locally to feel responsive
        const nextErrors = { ...prev.errors };
        if (nextErrors[name]) delete nextErrors[name];

        return { data: nextData, errors: nextErrors };
      });

      debounceValidate(name);
    },
    [getRegex, debounceValidate]
  );

  const handleSelectChange = useCallback(
    ({ currentTarget: sel }) => {
      const { name, value } = sel;
      setFormData((prev) => {
        const nextData = { ...prev.data, [name]: value };
        return { ...prev, data: nextData };
      });
      debounceValidate(name);
    },
    [debounceValidate]
  );

  const validateForm = useCallback(() => {
    if (!schema || !schema.validate) return null;

    // Clear all pending timeouts when doing a full submit
    Object.values(timeoutRefs.current).forEach(clearTimeout);

    const { error } = schema.validate(formData.data, { abortEarly: false });
    if (!error) return null;

    const newErrors = {};
    for (let item of error.details) {
      const errorPath = item.path.join(".");

      // Multiple validation errors unte, first error message ni matrame store chestunnam
      if (!newErrors[errorPath]) {
        newErrors[errorPath] = item.message;
      }
    }

    return newErrors;
  }, [formData.data, schema]);

  const resetForm = useCallback(() => {
    Object.values(timeoutRefs.current).forEach(clearTimeout);
    setFormData({ data: initialValues, errors: {} });
    clearStorage();
  }, [initialValues, clearStorage]);

  const scrollToFirstError = useCallback((errors) => {
    if (!errors) return;
    setTimeout(() => {
      const errorKeys = Object.keys(errors);
      const elements = errorKeys
        .map((key) => {
          let el = fieldRefs.current[key];
          if (!el || typeof el.scrollIntoView !== "function") {
            el = document.getElementById(key) || document.getElementsByName(key)[0];
          }
          return el;
        })
        .filter(Boolean);

      if (elements.length > 0) {
        // Sort elements by their vertical position in the document
        elements.sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectA.top - rectB.top;
        });

        const firstErrorElement = elements[0];

        // Smooth scroll to the element centered in view
        firstErrorElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Focus the input element if possible
        try {
          const input = firstErrorElement.querySelector?.("input, select, textarea") || firstErrorElement;
          if (input && typeof input.focus === "function") {
            input.focus({ preventScroll: true });
          }
        } catch (err) {
          console.warn("Could not focus error element:", err);
        }
      }
    }, 100);
  }, []);

  const handleFormSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      const errors = validateForm();
      if (errors) {
        setFormData((prev) => ({ ...prev, errors }));
        scrollToFirstError(errors);
        return;
      }

      setFormData((prev) => ({ ...prev, errors: {} }));
      doSubmit(formData.data);
    },
    [formData.data, validateForm, doSubmit, scrollToFirstError]
  );

  return {
    formData,
    fieldRefs,
    getData,
    getFormData,
    setData,
    setErrors,
    setField,
    handleInputChange,
    handleFormSubmit,
    handleNumberChange,
    handleSelectChange,
    validateForm,
    resetForm,
    registerRef,
    clearStorage,
    scrollToFirstError,
    errors: formData.errors,
  };
};