import { useEffect, useState, useRef } from "react";
import axios from "axios";
import * as bootstrap from "bootstrap";

import "./assets/style.css";

const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;

const INITIAL_TEMPLATE_DATA = {
  id: "",
  title: "",
  category: "",
  origin_price: "",
  price: "",
  unit: "",
  description: "",
  content: "",
  is_enabled: false,
  imageUrl: "",
  imagesUrl: [],
};

function App() {
  // 表單資料狀態(儲存登入表單輸入)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  // 登入狀態管理(控制顯示登入或產品頁）
  const [isAuth, setIsAuth] = useState(false);
  // 產品資料狀態
  const [products, setProducts] = useState([]);

  // Modal 控制相關狀態
  const productModalRef = useRef(null);
  const [modalType, setModalType] = useState(""); // "create", "edit", "delete"

  // 產品表單資料模板
  const [templateProduct, setTemplateProduct] = useState(INITIAL_TEMPLATE_DATA);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // console.log(name, value);
    setFormData((preData) => ({
      ...preData,
      [name]: value,
    }));
  };

  const handleModalInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setTemplateProduct((preData) => ({
      ...preData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const handleImageChange = (index, value) => {
    setTemplateProduct((prevData) => {
      const newImages = [...prevData.imagesUrl]; // 複製陣列
      newImages[index] = value; // 更新特定索引
      // 填寫最後一個空輸入框時，自動新增空白輸入框
      if (
        value !== "" &&
        index === newImages.length - 1 &&
        newImages.length < 5
      ) {
        newImages.push("");
      }

      // 清空輸入框時，移除最後的空白輸入框
      if (
        value === "" &&
        newImages.length > 1 &&
        newImages[newImages.length - 1] === ""
      ) {
        newImages.pop();
      }
      return { ...prevData, imagesUrl: newImages }; // 回傳新狀態
    });
  };

  // 新增圖片
  const handleAddImage = () => {
    setTemplateProduct((prevData) => {
      const newImages = [...prevData.imagesUrl];
      newImages.push("");
      return { ...prevData, imagesUrl: newImages };
    });
  };

  // 移除圖片
  const handleRemoveImage = () => {
    setTemplateProduct((prevData) => {
      const newImages = [...prevData.imagesUrl];
      newImages.pop();
      return { ...prevData, imagesUrl: newImages };
    });
  };

  const onSubmit = async (e) => {
    try {
      e.preventDefault();
      const response = await axios.post(`${API_BASE}/admin/signin`, formData);
      const { token, expired } = response.data;

      // 設定 cookie
      document.cookie = `hexToken=${token};expires=${new Date(expired)};`;
      // 設定 axios header
      axios.defaults.headers.common["Authorization"] = token;

      getProducts();
      // 設定登入成功狀態
      setIsAuth(true);
    } catch (error) {
      alert("登入失敗: ", error.response.data.message);
      setIsAuth(false);
    }
  };

  //確認是否登入

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("hexToken="))
      ?.split("=")[1];
    if (token) {
      axios.defaults.headers.common["Authorization"] = token;
    }
    productModalRef.current = new bootstrap.Modal("#productModal", {
      keyboard: false,
    });
    // Modal 關閉時移除焦點
    document
      .querySelector("#productModal")
      .addEventListener("hide.bs.modal", () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });

    const checkLogin = async () => {
      try {
        const response = await axios.post(`${API_BASE}/api/user/check`);
        console.log(response.data);
        setIsAuth(true);
        getProducts();
      } catch (error) {
        console.log(error.response.data.message);
      }
    };
    checkLogin();
  }, []);

  const openModal = (type, product) => {
    setTemplateProduct((prevData) => ({
      ...prevData,
      ...product,
    }));

    // 設定 Modal 類型並顯示
    setModalType(type);
    productModalRef.current.show();
  };

  const closeModal = () => {
    productModalRef.current.hide();
  };

  const getProducts = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/${API_PATH}/admin/products`,
      );
      setProducts(response.data.products);
      console.log("產品列表載入成功：", response.data.products);
    } catch (error) {
      console.error("取得產品列表失敗：", err.response?.data?.message);
      alert(
        "取得產品列表失敗：" + (err.response?.data?.message || err.message),
      );
    }
  };

  const updateProduct = async (id) => {
    let url = `${API_BASE}/api/${API_PATH}/admin/product `;
    let method = `post`;
    if (modalType === "edit") {
      url = `${API_BASE}/api/${API_PATH}/admin/product/${id}`;
      method = `put`;
    }
    const productData = {
      data: {
        ...templateProduct,
        origin_price: Number(templateProduct.origin_price),
        price: Number(templateProduct.price),
        is_enabled: templateProduct.is_enabled ? 1 : 0,
        imageUrl: [...templateProduct.imagesUrl.filter((url) => url !== "")],
      },
    };

    try {
      const response = await axios[method](url, productData);
      // console.log(response.data);
      getProducts();
      closeModal();
    } catch (error) {
      const errorMsg = error.response?.data?.message || err.message;
      console.log(`${modalType === "edit" ? "更新" : "新增"}失敗：`, errorMsg);
      alert(`${modalType === "edit" ? "更新" : "新增"}失敗：${errorMsg}`);
    }
  };

  const delProduct = async (id) => {
    try {
      const res = await axios.delete(
        `${API_BASE}/api/${API_PATH}/admin/product/${id}`,
      );
      closeModal();
      getProducts();
    } catch (error) {
      console.lod(error.response);
    }
  };

  return (
    <>
      {!isAuth ? (
        <div className='container login'>
          <h1 className='fs-5 fw-bold'>請先登入</h1>
          <form onSubmit={(e) => onSubmit(e)}>
            <div className='form-floating mb-3'>
              <input
                type='email'
                className='form-control'
                name='username'
                placeholder='name@example.com'
                autoComplete='username'
                value={formData.username}
                onChange={(e) => handleInputChange(e)}
              />
              <label htmlFor='username'>Email address</label>
            </div>
            <div className='form-floating'>
              <input
                type='password'
                className='form-control'
                name='password'
                placeholder='Password'
                autoComplete='current-password'
                value={formData.password}
                onChange={(e) => handleInputChange(e)}
              />
              <label htmlFor='password'>Password</label>
            </div>
            <button type='submit' className='btn btn-primary my-3 w-100'>
              登入
            </button>
          </form>
        </div>
      ) : (
        <div className='container'>
          <h2>產品列表</h2>
          <div className='container'>
            {/* 新增產品按鈕 */}
            <div className='text-end mt-4'>
              <button
                type='button'
                className='btn btn-primary'
                onClick={() => openModal("create", INITIAL_TEMPLATE_DATA)}>
                建立新的產品
              </button>
            </div>

            {/* 產品列表表格 */}
          </div>
          <table className='table'>
            <thead>
              <tr>
                <th>分類</th>
                <th>產品名稱</th>
                <th>原價</th>
                <th>售價</th>
                <th>是否啟用</th>
                <th>編輯</th>
              </tr>
            </thead>
            <tbody>
              {products && products.length > 0 ? (
                products.map((item) => (
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td>{item.title}</td>
                    <td>{item.origin_price}</td>
                    <td>{item.price}</td>
                    <td className={`${item.is_enabled ? "text-success" : ""}`}>
                      {item.is_enabled ? "啟用" : "未啟用"}
                    </td>
                    <td>
                      <div
                        className='btn-group'
                        role='group'
                        aria-label='Basic example'>
                        <button
                          type='button'
                          className='btn btn-outline-primary btn-sm'
                          onClick={() => openModal("edit", item)}>
                          編輯
                        </button>
                        <button
                          type='button'
                          className='btn btn-outline-danger btn-sm'
                          onClick={() => openModal("delete", item)}>
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='5'>尚無產品資料</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div
        id='productModal'
        className='modal fade'
        tabIndex='-1'
        aria-labelledby='productModalLabel'
        aria-hidden='true'
        ref={productModalRef}>
        <div className='modal-dialog modal-xl'>
          <div className='modal-content border-0'>
            <div
              className={`modal-header bg-${modalType === "delete" ? "danger" : "dark"} text-white`}>
              <h5 id='productModalLabel' className='modal-title'>
                <span>
                  {modalType === "delete"
                    ? "刪除"
                    : modalType === "edit"
                      ? "編輯"
                      : "新增"}
                  產品
                </span>
              </h5>
              <button
                type='button'
                className='btn-close'
                data-bs-dismiss='modal'
                aria-label='Close'></button>
            </div>
            <div className='modal-body'>
              {modalType === "delete" ? (
                <p className='fs-4'>
                  確認刪除
                  <span className='text-danger'>{templateProduct.title}</span>?
                </p>
              ) : (
                <div className='row'>
                  <div className='col-sm-4'>
                    <div className='mb-2'>
                      <div className='mb-3'>
                        <label htmlFor='imageUrl' className='form-label'>
                          輸入圖片網址
                        </label>
                        <input
                          type='text'
                          id='imageUrl'
                          name='imageUrl'
                          className='form-control'
                          placeholder='請輸入圖片連結'
                          value={templateProduct.imageUrl}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                      {templateProduct.imageUrl && (
                        <img
                          className='img-fluid'
                          src={templateProduct.imageUrl}
                          alt='主圖'
                        />
                      )}
                    </div>
                    <div>
                      {templateProduct.imagesUrl.map((url, index) => (
                        <div key={index}>
                          <label htmlFor='imageUrl' className='form-label'>
                            輸入圖片網址
                          </label>
                          <input
                            type='text'
                            className='form-control'
                            placeholder={`圖片網址${index + 1}`}
                            value={url}
                            onChange={(e) =>
                              handleImageChange(index, e.target.value)
                            }
                          />
                          {url && (
                            <img
                              className='img-fluid'
                              src={url}
                              alt={`副圖${index + 1}`}
                            />
                          )}
                        </div>
                      ))}
                      {templateProduct.imagesUrl.length < 5 &&
                        templateProduct.imagesUrl[
                          templateProduct.imagesUrl.length - 1
                        ] !== "" && (
                          <button
                            className='btn btn-outline-primary btn-sm d-block w-100'
                            onClick={() => handleAddImage()}>
                            新增圖片
                          </button>
                        )}
                    </div>
                    <div>
                      {templateProduct.imagesUrl.length >= 1 && (
                        <button
                          className='btn btn-outline-danger btn-sm d-block w-100'
                          onClick={() => handleRemoveImage()}>
                          刪除圖片
                        </button>
                      )}
                    </div>
                  </div>
                  <div className='col-sm-8'>
                    <div className='mb-3'>
                      <label htmlFor='title' className='form-label'>
                        標題
                      </label>
                      <input
                        name='title'
                        id='title'
                        type='text'
                        className='form-control'
                        placeholder='請輸入標題'
                        value={templateProduct.title}
                        onChange={(e) => handleModalInputChange(e)}
                        disabled={modalType === "edit"}
                      />
                    </div>

                    <div className='row'>
                      <div className='mb-3 col-md-6'>
                        <label htmlFor='category' className='form-label'>
                          分類
                        </label>
                        <input
                          name='category'
                          id='category'
                          type='text'
                          className='form-control'
                          placeholder='請輸入分類'
                          value={templateProduct.category}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                      <div className='mb-3 col-md-6'>
                        <label htmlFor='unit' className='form-label'>
                          單位
                        </label>
                        <input
                          name='unit'
                          id='unit'
                          type='text'
                          className='form-control'
                          placeholder='請輸入單位'
                          value={templateProduct.unit}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                    </div>

                    <div className='row'>
                      <div className='mb-3 col-md-6'>
                        <label htmlFor='origin_price' className='form-label'>
                          原價
                        </label>
                        <input
                          name='origin_price'
                          id='origin_price'
                          type='number'
                          min='0'
                          className='form-control'
                          placeholder='請輸入原價'
                          value={templateProduct.origin_price}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                      <div className='mb-3 col-md-6'>
                        <label htmlFor='price' className='form-label'>
                          售價
                        </label>
                        <input
                          name='price'
                          id='price'
                          type='number'
                          min='0'
                          className='form-control'
                          placeholder='請輸入售價'
                          value={templateProduct.price}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                    </div>
                    <hr />

                    <div className='mb-3'>
                      <label htmlFor='description' className='form-label'>
                        產品描述
                      </label>
                      <textarea
                        name='description'
                        id='description'
                        className='form-control'
                        placeholder='請輸入產品描述'
                        value={templateProduct.description}
                        onChange={(e) => handleModalInputChange(e)}></textarea>
                    </div>
                    <div className='mb-3'>
                      <label htmlFor='content' className='form-label'>
                        說明內容
                      </label>
                      <textarea
                        name='content'
                        id='content'
                        className='form-control'
                        placeholder='請輸入說明內容'
                        value={templateProduct.content}
                        onChange={(e) => handleModalInputChange(e)}></textarea>
                    </div>
                    <div className='mb-3'>
                      <div className='form-check'>
                        <input
                          name='is_enabled'
                          id='is_enabled'
                          className='form-check-input'
                          type='checkbox'
                          checked={templateProduct.is_enabled}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                        <label
                          className='form-check-label'
                          htmlFor='is_enabled'>
                          是否啟用
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className='modal-footer'>
              {modalType === "delete" ? (
                <button
                  type='button'
                  className='btn btn-danger'
                  onClick={() => delProduct(templateProduct.id)}>
                  刪除
                </button>
              ) : (
                <>
                  <button
                    type='button'
                    className='btn btn-outline-secondary'
                    data-bs-dismiss='modal'
                    onClick={() => closeModal()}>
                    取消
                  </button>
                  <button
                    type='button'
                    className='btn btn-primary'
                    onClick={() => updateProduct(templateProduct.id)}>
                    確認
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
