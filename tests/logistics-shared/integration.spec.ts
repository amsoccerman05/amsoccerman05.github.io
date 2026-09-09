import {test,expect,type Page} from '@playwright/test';
async function login(page:Page,role='mentor'){await page.goto('/');await page.getByLabel('Email',{exact:true}).fill(role+'@example.test');await page.getByLabel('Password',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page.getByRole('button',{name:'Inventory',exact:true})).toBeVisible();}
test('shared project movement updates balances and home audit via SQL RPC',async({page})=>{
 await login(page);await page.goto('/#locations');await page.getByLabel('Location name',{exact:true}).fill('Drivebase Prototype');await page.getByRole('button',{name:'Create location',exact:true}).click();await expect(page.getByRole('button',{name:/Drivebase Prototype/})).toBeVisible();
 await page.goto('/#inventory');await page.getByRole('button',{name:'Move 5/32" Allen wrench',exact:true}).click();await page.getByLabel('To location',{exact:true}).selectOption({label:'Drivebase Prototype'});await page.getByRole('button',{name:'Move inventory',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goto('/#location/10000000-0000-4000-8000-000000000001');const row=page.locator('.audit-row').filter({has:page.getByRole('button',{name:'5/32" Allen wrench',exact:true})});await expect(row).toContainText('1 assigned elsewhere');await expect(row).toContainText('0 unaccounted');await page.getByRole('button',{name:'Mark drawer verified',exact:true}).click();await expect(page.getByRole('status')).toContainText('verified');
});
test('private photo upload, signed rendering, replacement and deletion use repository',async({page})=>{
 await login(page);await page.goto('/#inventory');await page.getByRole('button',{name:'5/32" Allen wrench',exact:true}).click();
 const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2;c.height=2;const x=c.getContext('2d')!;x.fillStyle='green';x.fillRect(0,0,2,2);return c.toDataURL('image/png').split(',')[1];}),'base64');
 await page.getByLabel('Photo description').fill('SAE wrench reference');await page.getByLabel('Upload item photo').setInputFiles({name:'wrench.png',mimeType:'image/png',buffer:png});await expect(page.getByRole('dialog').getByAltText('SAE wrench reference')).toBeVisible();
 await page.getByLabel('Photo description').fill('Replacement wrench photo');await page.getByLabel('Upload item photo').setInputFiles({name:'updated.png',mimeType:'image/png',buffer:png});await expect(page.getByRole('dialog').getByAltText('Replacement wrench photo')).toBeVisible();
 await page.getByRole('button',{name:'Delete photo',exact:true}).click();await expect(page.locator('.photo-panel img')).toHaveCount(0);
});
test('student sees balance controls and cannot manage photos or create trips',async({page})=>{
 await login(page,'student');await page.goto('/#inventory');await page.getByRole('button',{name:'5/32" Allen wrench',exact:true}).click();await expect(page.getByLabel('Upload item photo')).toHaveCount(0);await expect(page.getByRole('button',{name:'Save count'}).first()).toBeEnabled();await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.goto('/#travel');await expect(page.getByRole('button',{name:'Create trip',exact:true})).toHaveCount(0);
});
